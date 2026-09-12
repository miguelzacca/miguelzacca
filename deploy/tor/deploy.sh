#!/usr/bin/env bash
set -Eeuo pipefail
umask 022
export PATH=/opt/miguelzacca-onion/node/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

die() { printf 'Erro: %s\n' "$*" >&2; exit 1; }
(( EUID == 0 )) || die 'Use sudo bash deploy/tor/deploy.sh [--if-needed | --rollback RELEASE].'
[[ $(uname -s) == Linux && -r /etc/os-release ]] || die 'Execute no Ubuntu Server.'
# shellcheck disable=SC1091
. /etc/os-release
[[ $ID == ubuntu ]] || die 'Este deploy suporta apenas Ubuntu.'
readonly BASE=/opt/miguelzacca-onion
readonly SOURCE=$BASE/source
readonly WEB=/var/www/miguelzacca-onion
readonly RELEASES=$WEB/releases
readonly CURRENT=$WEB/current
readonly REVISIONS=$WEB/revisions
readonly DEPLOY_USER=miguelzacca-onion
readonly RELEASE_PATTERN='^[0-9]{8}T[0-9]{6}\.[0-9]{9}Z$'
mode=deploy
automatic=0
target=
if [[ $# == 1 && $1 == --if-needed ]]; then
    automatic=1
elif [[ $# == 2 && $1 == --rollback ]]; then
    mode=rollback
    [[ $2 =~ $RELEASE_PATTERN ]] || die 'Informe apenas o nome timestamp da release.'
    target=$RELEASES/$2
elif (( $# )); then
    die 'Uso: sudo bash deploy/tor/deploy.sh [--if-needed | --rollback RELEASE]'
fi

exec 9>/run/lock/miguelzacca-onion.lock
if ! flock -n 9; then
    if (( automatic )); then
        printf 'Outro bootstrap/deploy/rollback está em andamento; nova tentativa no próximo ciclo.\n'
        exit 0
    fi
    die 'Outro bootstrap/deploy/rollback está em andamento.'
fi
for path in "$BASE" "$BASE/home" "$SOURCE" "$WEB" "$RELEASES"; do
    [[ -d $path && ! -L $path ]] || die "Execute bootstrap.sh; diretório inválido: $path"
done
[[ ! -L $REVISIONS && ( ! -e $REVISIONS || -d $REVISIONS ) ]] || die 'Diretório de revisões inválido.'
systemctl is-active --quiet miguelzacca-onion-nginx.service || die 'Nginx do projeto não está ativo.'

validate_release() {
    local release=$1
    [[ $(dirname -- "$release") == "$RELEASES" && ${release##*/} =~ $RELEASE_PATTERN \
        && -d $release && ! -L $release && -s $release/index.html && ! -L $release/index.html ]]
}
previous=
if [[ -L $CURRENT ]]; then
    previous=$(readlink -f -- "$CURRENT")
    validate_release "$previous" || die 'current não aponta para uma release válida; revise antes de continuar.'
elif [[ -e $CURRENT ]]; then
    die 'current precisa ser um symlink; nenhum arquivo foi substituído.'
fi

# The temporary link lives beside current, guaranteeing same-filesystem rename.
temporary_link=$WEB/.current.$$
response=$(mktemp "$WEB/.health.XXXXXXXX")
revision_temporary=
build_work=
switched=0
committed=0
atomic_link() {
    ln -s -- "$1" "$temporary_link"
    mv -Tf -- "$temporary_link" "$CURRENT"
}
health_check() {
    # Do not inherit an HTTP proxy or accept redirects / another site's 200 page.
    local status
    status=$(curl --noproxy '*' --fail --silent --show-error \
        --connect-timeout 5 --max-time 20 --output "$response" \
        --write-out '%{http_code}' http://127.0.0.1:8080/) || return 1
    [[ $status == 200 ]] && cmp -s -- "$response" "$1/index.html"
}
cleanup() {
    local result=$?
    trap - EXIT HUP INT TERM
    if (( switched && ! committed )); then
        printf 'Validação interrompida/falhou; restaurando current anterior.\n' >&2
        rm -f -- "$temporary_link"
        if [[ -n $previous ]]; then
            if atomic_link "$previous"; then
                health_check "$previous" || printf 'ATENÇÃO: rollback aplicado, mas HTTP ainda falha; verifique Nginx.\n' >&2
            else
                printf 'ERRO: rollback não pôde ser aplicado. Release anterior: %s\n' "$previous" >&2
            fi
        else
            # First deploy has no previous site. Remove only our pointer.
            rm -f -- "$CURRENT"
            printf 'Primeiro deploy: não havia release anterior.\n' >&2
        fi
        result=1
    fi
    rm -f -- "$temporary_link" "$response"
    [[ -z $revision_temporary ]] || rm -f -- "$revision_temporary"
    if [[ -n $build_work && $build_work == "$BASE/home"/build.* && ! -L $build_work ]]; then
        rm -rf --one-file-system -- "$build_work"
    fi
    exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP

if [[ $mode == deploy ]]; then
    as_builder() { runuser -u "$DEPLOY_USER" -- env HOME="$BASE/home" PATH="$PATH" "$@"; }
    [[ -d $SOURCE/.git ]] || die 'Checkout ausente; execute bootstrap.sh.'
    [[ $(as_builder git -C "$SOURCE" remote get-url origin) == https://github.com/miguelzacca/miguelzacca.git ]] \
        || die 'origin inesperado no checkout de produção.'
    [[ $(as_builder git -C "$SOURCE" branch --show-current) == main ]] || die 'O checkout precisa estar em main.'
    [[ -z $(as_builder git -C "$SOURCE" status --porcelain) ]] || die 'Checkout possui alterações locais; revise sem usar reset --hard.'
    as_builder git -C "$SOURCE" fetch --prune origin main
    revision=$(as_builder git -C "$SOURCE" rev-parse --verify 'refs/remotes/origin/main^{commit}')
    deployed_revision=
    if [[ -n $previous ]]; then
        metadata=$REVISIONS/${previous##*/}
        [[ ! -L $metadata ]] || die 'Metadado de revisão não pode ser symlink.'
        if [[ -f $metadata ]]; then
            deployed_revision=$(< "$metadata")
            [[ $deployed_revision =~ ^[0-9a-f]{40}$ ]] || die 'SHA implantado inválido.'
        fi
    fi
    printf 'origin/main=%s; implantado=%s\n' "$revision" "${deployed_revision:-desconhecido}"
    if (( automatic )) && [[ $revision == "$deployed_revision" ]]; then
        printf 'Sem alteração: nenhum npm ci, build ou nova release.\n'
        exit 0
    fi
    # Pin this deployment to the fetched commit, including its metadata.
    as_builder git -C "$SOURCE" merge-base --is-ancestor HEAD "$revision" \
        || die 'main divergiu ou contém commits locais; o site atual foi preservado.'
    as_builder git -C "$SOURCE" merge --ff-only "$revision"
    # The normal build regenerates tracked assets. Build an exact Git snapshot
    # so those generated files cannot dirty source and block the next update.
    build_work=$(as_builder mktemp -d "$BASE/home/build.XXXXXXXX")
    as_builder git -C "$SOURCE" archive --format=tar "$revision" \
        | as_builder tar -xf - -C "$build_work"
    (
        cd "$build_work"
        as_builder npm ci --include=dev
        as_builder npm run build
    )
    [[ -d $build_work/dist && ! -L $build_work/dist && -s $build_work/dist/index.html ]] || die 'Build não gerou dist/index.html.'
    [[ -z $(find "$build_work/dist" -type l -print -quit) ]] || die 'dist não pode conter symlinks.'
    target=$RELEASES/$(date -u +%Y%m%dT%H%M%S.%NZ)
    mkdir -m 0755 -- "$target"
    rsync -rlt --chmod=D755,F644 -- "$build_work/dist/" "$target/"
fi
validate_release "$target" || die 'Release alvo inválida ou sem index.html.'
[[ $target != "$previous" ]] || die 'Esta release já está ativa.'

# Mark before rename so a signal immediately after it also triggers rollback.
switched=1
atomic_link "$target"
health_check "$target" || die 'A nova release falhou na verificação HTTP.'
if [[ $mode == deploy ]]; then
    # Record only a healthy release. The current symlink also selects its SHA,
    # so rollbacks do not depend on a second independently updated state file.
    install -d -m 0755 "$REVISIONS"
    revision_temporary=$(mktemp "$REVISIONS/.commit.XXXXXXXX")
    printf '%s\n' "$revision" > "$revision_temporary"
    chmod 0644 "$revision_temporary"
    mv -Tf -- "$revision_temporary" "$REVISIONS/${target##*/}"
    revision_temporary=
fi
committed=1
printf 'Release ativa: %s\n' "${target##*/}"

# Retain the three newest releases plus current and its rollback predecessor.
# Never follow symlinks, delete another directory, or prune before validation.
if [[ $mode == deploy ]]; then
    mapfile -t releases < <(find "$RELEASES" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | LC_ALL=C sort -r)
    count=0
    for name in "${releases[@]}"; do
        [[ $name =~ $RELEASE_PATTERN ]] || continue
        count=$((count + 1))
        candidate=$RELEASES/$name
        if (( count > 3 )) && [[ $candidate != "$target" && $candidate != "$previous" && ! -L $candidate ]]; then
            rm -rf --one-file-system -- "$candidate"
            rm -f -- "$REVISIONS/$name"
        fi
    done
fi
printf 'HTTP local validado. A identidade .onion não foi alterada.\n'
