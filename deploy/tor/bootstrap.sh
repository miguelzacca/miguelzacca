#!/usr/bin/env bash
set -Eeuo pipefail
umask 022
export PATH=/opt/miguelzacca-onion/node/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

die() { printf 'Erro: %s\n' "$*" >&2; exit 1; }
[[ $(uname -s) == Linux && -r /etc/os-release ]] || die 'Execute no Ubuntu Server.'
# shellcheck disable=SC1091
. /etc/os-release
[[ $ID == ubuntu ]] || die 'Este bootstrap suporta apenas Ubuntu.'
(( EUID == 0 )) || die 'Use sudo bash deploy/tor/bootstrap.sh.'
[[ -d /run/systemd/system ]] || die 'O Ubuntu precisa estar executando systemd.'
[[ $# == 0 ]] || die 'O bootstrap não recebe argumentos.'

readonly BASE=/opt/miguelzacca-onion
readonly SOURCE=$BASE/source
readonly WEB=/var/www/miguelzacca-onion
readonly DEPLOY_USER=miguelzacca-onion
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
readonly SCRIPT_DIR
readonly NGINX_CONFIG=/etc/nginx/miguelzacca-onion.conf
readonly TOR_CONFIG=/etc/tor/miguelzacca-onion.conf
readonly NGINX_SERVICE=miguelzacca-onion-nginx.service
readonly TOR_SERVICE=miguelzacca-onion-tor.service

exec 9>/run/lock/miguelzacca-onion.lock
flock -n 9 || die 'Outro bootstrap/deploy/rollback está em andamento.'
for path in "$BASE" "$SOURCE" "$WEB" "$WEB/releases" \
    /var/lib/tor/miguelzacca-onion /var/lib/tor/miguelzacca-onion-data; do
    [[ ! -L $path ]] || die "Diretório não pode ser symlink: $path"
done

# Do not stop or reconfigure another website to claim its port.
listeners=$(ss -H -ltn '( sport = :80 or sport = :443 or sport = :8080 )')
if awk 'NF && $4 !~ /^(127\.0\.0\.1|\[::1\]):[0-9]+$/ { found=1 } END { exit !found }' <<< "$listeners"; then
    die 'Há um listener HTTP público em 80/443/8080. Prepare uma VPS dedicada; nenhum serviço existente foi alterado.'
fi
if [[ -n $(ss -H -ltn 'sport = :8080') ]] && ! systemctl is-active --quiet "$NGINX_SERVICE"; then
    die 'A porta 8080 já está ocupada por outro serviço.'
fi

packages=()
for entry in tor:tor nginx:nginx git:git rsync:rsync curl:curl xz:xz-utils; do
    command -v "${entry%%:*}" >/dev/null || packages+=("${entry#*:}")
done
dpkg-query -W -f='${Status}' ca-certificates 2>/dev/null | grep -qx 'install ok installed' \
    || packages+=(ca-certificates)

# Mask before apt: package post-install scripts must not start a public default
# nginx, even briefly. Only mask stock services when installing them from scratch.
if ! command -v nginx >/dev/null; then
    [[ ! -e /etc/nginx/nginx.conf ]] || die 'Nginx parcial encontrado; conclua ou revise essa instalação primeiro.'
    systemctl mask nginx.service
fi
if ! command -v tor >/dev/null; then
    systemctl mask tor.service tor@default.service
fi
if (( ${#packages[@]} )); then
    apt-get update
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends "${packages[@]}"
fi

install -d -m 0755 "$BASE" "$WEB" "$WEB/releases"
work=$(mktemp -d "$BASE/.bootstrap.XXXXXXXX")
trap 'rm -rf -- "$work"' EXIT

# Use the existing compatible Node/npm. If either is missing, install the
# official Node 24 bundle privately, without replacing the system's Node.
if ! command -v node >/dev/null || ! command -v npm >/dev/null; then
    case $(dpkg --print-architecture) in
        amd64) arch=x64 ;;
        arm64) arch=arm64 ;;
        *) die 'Instalação automática de Node disponível para amd64 e arm64.' ;;
    esac
    [[ ! -e $BASE/node ]] || die 'Instalação privada de Node incompleta; revise /opt/miguelzacca-onion/node.'
    url=https://nodejs.org/dist/latest-v24.x
    curl --fail --silent --show-error --location "$url/SHASUMS256.txt" -o "$work/SHASUMS256.txt"
    checksum=$(awk -v arch="$arch" '$2 ~ ("^node-v24\\.[0-9]+\\.[0-9]+-linux-" arch "\\.tar\\.xz$") {print}' "$work/SHASUMS256.txt")
    [[ $(wc -l <<< "$checksum") == 1 && -n $checksum ]] || die 'Manifesto de Node inesperado.'
    archive=${checksum##* }
    curl --fail --silent --show-error --location "$url/$archive" -o "$work/$archive"
    (cd "$work" && printf '%s\n' "$checksum" | sha256sum --check --status)
    mkdir "$work/node"
    tar -xJf "$work/$archive" --strip-components=1 -C "$work/node"
    chmod -R a+rX "$work/node"
    mv -T "$work/node" "$BASE/node"
    hash -r
fi
node -e 'const [a,b]=process.versions.node.split(".").map(Number); process.exit((a===20&&b>=19)||(a===22&&b>=13)||a>=24?0:1)' \
    || die 'Node incompatível: use 20.19+, 22.13+ ou 24+. A instalação existente foi preservada.'
npm --version >/dev/null

if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
    useradd --system --user-group --home-dir "$BASE/home" --shell /usr/sbin/nologin "$DEPLOY_USER"
fi
[[ $(id -u "$DEPLOY_USER") != 0 ]] || die 'O usuário de build não pode ser root.'
install -d -m 0750 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$BASE/home" "$SOURCE"
if [[ ! -d $SOURCE/.git ]]; then
    [[ -z $(find "$SOURCE" -mindepth 1 -maxdepth 1 -print -quit) ]] || die 'O checkout source não está vazio.'
    runuser -u "$DEPLOY_USER" -- env HOME="$BASE/home" PATH="$PATH" \
        git clone --branch main --single-branch https://github.com/miguelzacca/miguelzacca.git "$SOURCE"
fi

# Only create/adjust the directory itself; never erase or replace its contents.
if [[ -f /var/lib/tor/miguelzacca-onion/hostname && ! -s /var/lib/tor/miguelzacca-onion/hs_ed25519_secret_key ]]; then
    die 'Identidade Tor incompleta. Restaure a chave original antes de iniciar Tor.'
fi
install -d -m 0700 -o debian-tor -g debian-tor \
    /var/lib/tor/miguelzacca-onion /var/lib/tor/miguelzacca-onion-data
# Accept an identity restored by root without changing a single key byte.
for name in hs_ed25519_secret_key hs_ed25519_public_key hostname; do
    key=/var/lib/tor/miguelzacca-onion/$name
    [[ ! -L $key ]] || die 'Arquivos da identidade Tor não podem ser symlinks.'
    if [[ -f $key ]]; then
        chown debian-tor:debian-tor "$key"
        chmod 0600 "$key"
    fi
done
install -d -m 0755 /run/miguelzacca-onion-nginx
install -m 0644 "$SCRIPT_DIR/nginx.conf" "$work/nginx.conf"
install -m 0644 "$SCRIPT_DIR/torrc.conf" "$work/torrc.conf"
# Tor validates as its runtime user, so its candidate must be traversable.
chmod 0755 "$work"
nginx -t -e stderr -c "$work/nginx.conf"
runuser -u debian-tor -- tor --verify-config --defaults-torrc /dev/null -f "$work/torrc.conf"

# Publish configs only after BOTH validations; existing processes are still live.
install -m 0644 "$work/nginx.conf" "$NGINX_CONFIG.new"
mv -Tf "$NGINX_CONFIG.new" "$NGINX_CONFIG"
install -m 0644 "$work/torrc.conf" "$TOR_CONFIG.new"
mv -Tf "$TOR_CONFIG.new" "$TOR_CONFIG"
cat > "$work/$NGINX_SERVICE" <<'UNIT'
[Unit]
Description=Miguel Zacca onion static site (loopback only)
After=network.target

[Service]
Type=simple
RuntimeDirectory=miguelzacca-onion-nginx
ExecStartPre=/usr/sbin/nginx -t -e stderr -c /etc/nginx/miguelzacca-onion.conf
ExecStart=/usr/sbin/nginx -e stderr -c /etc/nginx/miguelzacca-onion.conf -g "daemon off;"
ExecReload=/usr/sbin/nginx -t -e stderr -c /etc/nginx/miguelzacca-onion.conf
ExecReload=/bin/kill -HUP $MAINPID
KillSignal=SIGQUIT
TimeoutStopSec=30
Restart=on-failure
PrivateTmp=true
ProtectHome=true
ProtectSystem=strict
ReadWritePaths=/run/miguelzacca-onion-nginx
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
UNIT
cat > "$work/$TOR_SERVICE" <<'UNIT'
[Unit]
Description=Miguel Zacca Tor onion service v3
Wants=network-online.target
After=network-online.target miguelzacca-onion-nginx.service

[Service]
Type=simple
User=debian-tor
Group=debian-tor
UMask=0077
ExecStartPre=/usr/bin/tor --verify-config --defaults-torrc /dev/null -f /etc/tor/miguelzacca-onion.conf
ExecStart=/usr/bin/tor --defaults-torrc /dev/null -f /etc/tor/miguelzacca-onion.conf
ExecReload=/usr/bin/tor --verify-config --defaults-torrc /dev/null -f /etc/tor/miguelzacca-onion.conf
ExecReload=/bin/kill -HUP $MAINPID
Restart=on-failure
PrivateTmp=true
ProtectHome=true
ProtectSystem=strict
ReadWritePaths=/var/lib/tor/miguelzacca-onion /var/lib/tor/miguelzacca-onion-data
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
UNIT
install -m 0644 "$work/$NGINX_SERVICE" "$work/$TOR_SERVICE" /etc/systemd/system/
systemctl daemon-reload
systemctl enable "$NGINX_SERVICE" "$TOR_SERVICE"
systemctl reload-or-restart "$NGINX_SERVICE"
systemctl reload-or-restart "$TOR_SERVICE"
systemctl is-active --quiet "$NGINX_SERVICE" "$TOR_SERVICE"
printf 'Bootstrap concluído. Execute sudo bash deploy/tor/deploy.sh para publicar dist/.\n'
printf 'Endereço (quando Tor gerar a identidade): sudo cat /var/lib/tor/miguelzacca-onion/hostname\n'
