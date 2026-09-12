# Portfolio via Tor Onion Service v3

Esta infraestrutura publica o mesmo `dist/` produzido por `npm run build`,
diretamente do disco da VPS. O deploy da Vercel, `vercel.json`, o build, o site,
as URLs, o SEO e o canonical `https://miguelzacca.dev/` permanecem intactos.
Os links externos existentes continuam levando aos seus destinos originais.

```text
GitHub/main → npm ci → npm run build → dist/
                                      ↓ cópia completa
                  /var/www/miguelzacca-onion/releases/<timestamp>
                                      ↑ current (symlink atômico)
Tor Onion v3:80 → Nginx 127.0.0.1:8080 ──┘
```

Não há proxy para Vercel, redirecionamento de domínio, DNS, Cloudflare,
Let's Encrypt ou HTTPS público. A porta virtual 80 do Onion Service não é uma
porta pública da VPS. Nenhum script abre portas no firewall ou na Oracle.

## 1. Criar e preparar a VPS Ubuntu na Oracle Cloud

1. Em **Compute → Instances → Create instance**, escolha Ubuntu Server 24.04 LTS
   ou 26.04 LTS, arquitetura amd64 ou arm64 (incluindo Ampere), com systemd.
   Reserve memória e disco para `npm ci`, o build e ao menos três cópias de `dist/`.
   Use uma VPS dedicada, uma chave SSH e o usuário administrativo `ubuntu`.
2. Associe a VNIC a uma subnet com saída para a Internet (Internet Gateway e rota
   de saída; IP público para SSH direto, ou bastion para uma subnet privada).
3. Revise **todas** as Security Lists da subnet e todos os NSGs da VNIC. As regras
   são cumulativas: um NSG restritivo não cancela uma permissão de outra lista.
   A única porta de entrada para administração deve ser **TCP 22**, com origem
   limitada ao seu IP/CIDR administrativo. Não adicione ingresso TCP 80, 443 ou
   8080, nem regras de todas as portas. Revise IPv6 também, se habilitado.
4. Mantenha saída para DNS, relógio/NTP, repositórios Ubuntu, GitHub, npm,
   nodejs.org e rede Tor. Uma regra stateful de saída permite os retornos das
   conexões iniciadas pela VPS; Tor não precisa de uma porta pública de entrada.
   Não confunda essas respostas com a abertura de um servidor HTTP.
5. Conecte e atualize o sistema antes da instalação:

   ```bash
   ssh -i ~/.ssh/SUA_CHAVE ubuntu@IP_DA_VPS
   sudo apt-get update
   sudo apt-get upgrade
   # Se o sistema solicitar reboot, reinicie e reconecte antes de continuar.
   sudo ss -lntp
   sudo iptables -S
   sudo ip6tables -S
   ```

   Preserve as regras necessárias da imagem Oracle, loopback e tráfego
   established/related. No firewall local, permita entrada administrativa em
   TCP 22 e bloqueie novas conexões externas às demais portas. Se já usar UFW,
   revise `sudo ufw status verbose`; não ative um segundo gerenciador nem limpe
   regras existentes às cegas. Configure a regra SSH e teste uma segunda sessão
   antes de encerrar a primeira. Não execute `ufw allow 'Nginx Full'`.

Referência: [Security Lists da Oracle](https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/securitylists.htm).

## 2. Clonar e executar

Depois de revisar e incorporar estes arquivos à `main` por seu processo normal:

```bash
command -v git >/dev/null || sudo apt-get install -y git
git clone --branch main --single-branch https://github.com/miguelzacca/miguelzacca.git
cd miguelzacca
sudo bash deploy/tor/bootstrap.sh
sudo bash deploy/tor/deploy.sh
```

Use `bash` explicitamente; não é necessário mudar permissões dos scripts. O
bootstrap é idempotente. Ele instala apenas as ferramentas ausentes: Tor, Nginx,
Git, rsync e auxiliares curl, certificados CA e xz. Usa Node/npm existentes se
compatíveis com as dependências (Node 20.19+, 22.13+ ou 24+). Se faltar Node ou
npm, instala o bundle oficial Node 24 com npm em
`/opt/miguelzacca-onion/node`, verificando SHA-256 pelo manifesto HTTPS oficial.
Não substitui o Node do sistema. Uma versão já instalada e incompatível causa
uma mensagem de erro para você atualizar conscientemente antes de repetir.

O bootstrap cria o usuário de sistema sem login `miguelzacca-onion` e um segundo
checkout de `main` em `/opt/miguelzacca-onion/source`. Git/npm/build rodam com esse
usuário, sem root. O diretório `/opt/miguelzacca-onion/home` contém seu cache npm.
As releases e `current` são controlados por root; o Nginx só precisa lê-los.

Serviços e configurações exclusivos instalados na VPS:

| Item | Local/nome |
| --- | --- |
| Nginx | `/etc/nginx/miguelzacca-onion.conf` |
| Tor | `/etc/tor/miguelzacca-onion.conf` |
| Units systemd | `/etc/systemd/system/miguelzacca-onion-{nginx,tor}.service` |
| Releases | `/var/www/miguelzacca-onion/releases/` |
| Symlink ativo | `/var/www/miguelzacca-onion/current` |
| Identidade permanente | `/var/lib/tor/miguelzacca-onion/` |
| Estado de conexão Tor | `/var/lib/tor/miguelzacca-onion-data/` |

O Nginx usa uma configuração completa própria, sem importar `sites-enabled`,
`conf.d` ou o site padrão. Nenhum outro site é editado ou desabilitado. Se Nginx
estiver ausente, **antes do apt** o bootstrap mascara `nginx.service`, impedindo
que a instalação ou um reboot inicie o servidor padrão em porta pública. O
serviço usado aqui é `miguelzacca-onion-nginx.service`; mantenha o padrão
mascarado nessa VPS dedicada. A instalação nova de Tor também mascara os
serviços padrão `tor.service` e `tor@default.service`, usando sua própria unit.
Instalações existentes não são mascaradas. Se já houver HTTP público em
80/443/8080 ou outro serviço ocupando 8080, o bootstrap para para revisão.

Ambas as configurações são validadas antes de substituir arquivos ativos ou
recarregar/iniciar os serviços. Tor roda como `debian-tor`, com diretórios 0700.
Os serviços são habilitados no boot. Antes do primeiro deploy, a raiz HTTP pode
retornar erro porque ainda não há `current`; o bootstrap não publica uma página
alternativa. Uma falha de instalação pode ser corrigida e o bootstrap repetido.

## 3. Verificar Nginx, Tor e logs

```bash
sudo nginx -t -e stderr -c /etc/nginx/miguelzacca-onion.conf
sudo systemctl status miguelzacca-onion-nginx.service --no-pager
sudo ss -lntp '( sport = :80 or sport = :443 or sport = :8080 )'
curl --noproxy '*' -f http://127.0.0.1:8080/

sudo -u debian-tor tor --verify-config --defaults-torrc /dev/null \
  -f /etc/tor/miguelzacca-onion.conf
sudo systemctl status miguelzacca-onion-tor.service --no-pager
sudo journalctl -u miguelzacca-onion-nginx.service -n 100 --no-pager
sudo journalctl -u miguelzacca-onion-tor.service -n 100 --no-pager
# Acompanhar continuamente; Ctrl+C encerra apenas a visualização:
sudo journalctl -u miguelzacca-onion-tor.service -f
```

O único listener HTTP esperado é **127.0.0.1:8080**. Não deve haver HTTP em
`0.0.0.0`, `[::]` ou no IP da VNIC. O acesso HTTP é desativado nos logs do Nginx;
erros vão para o journal. Tor não abre SOCKS, ControlPort, ORPort ou DirPort.
Confira também, de outra máquina, que 80/443/8080 do IP público estão inacessíveis.

Obtenha o endereço público do Onion Service (somente `hostname`, nunca as chaves):

```bash
sudo cat /var/lib/tor/miguelzacca-onion/hostname
```

Abra `http://ENDERECO_DE_56_CARACTERES.onion/` no
[Tor Browser oficial](https://www.torproject.org/download/). Aguarde a conexão
Tor completar e a publicação do descriptor; um serviço systemd ativo ou o curl
local bem-sucedido não comprovam alcance pela rede Tor. Verifique o carregamento
das seções, imagens, fontes e navegação no navegador. As opções de segurança do
Tor Browser podem limitar JavaScript/WebGL; o HTML e os fallbacks existentes são
preservados, sem CSP ou outros headers novos interferindo no site.

## 4. Atualizar no futuro

```bash
cd ~/miguelzacca
git pull --ff-only origin main
sudo bash deploy/tor/deploy.sh
```

O deploy atualiza o checkout de produção com `git fetch` e `git merge --ff-only
origin/main`, executa `npm ci --include=dev` e o `npm run build` original. Recusa
checkout sujo, branch incorreta, origin inesperado ou commits locais divergentes.
Se houver alterações locais, revise-as; não use `reset --hard` automaticamente.
O build existente também regenera `assets/signature.js` e seu arquivo de licença
no checkout de produção. Se esses arquivos aparecerem como modificados em um
update futuro, confira se são apenas os resultados gerados antes de restaurá-los
manualmente. Nenhuma mudança é enviada ao GitHub pelo script.

Após conferir `dist/index.html`, copia todo `dist/` para uma release UTC como
`20260912T153000.123456789Z`. Só então renomeia atomicamente um symlink temporário
para `current`. Um lock impede bootstrap, deploy e rollback simultâneos. A
verificação exige HTTP 200 e corpo idêntico ao `index.html` da release, sem
seguir redirects ou usar proxies do ambiente. Falha de instalação, fetch, npm
ou build deixa o site anterior intacto. Falha HTTP ou interrupção capturável
durante a troca restaura `current` e verifica a release anterior; no primeiro
deploy, remove apenas o symlink, pois não existe release anterior.

Somente depois do sucesso são removidas releases além das três mais recentes;
a ativa e a predecessora também são preservadas mesmo quando mais antigas.
Releases de tentativas malsucedidas podem permanecer para inspeção até um deploy
bem-sucedido posterior. Rollback manual não faz limpeza. Falta de energia ou
SIGKILL não permite executar traps: após reiniciar, confira `current`, faça o
curl local e use rollback se necessário. O rename evita um symlink parcialmente
substituído, mas não é uma promessa de recuperação automática de falhas de disco.

Deploys de conteúdo não recarregam Nginx/Tor e nunca acessam as chaves. Se alterar
esta infraestrutura no futuro, atualize seu clone administrativo e execute
`bootstrap.sh` novamente antes de `deploy.sh`.

## 5. Rollback manual

```bash
readlink -f /var/www/miguelzacca-onion/current
ls -1 /var/www/miguelzacca-onion/releases
# Substitua pelo nome exato de uma release existente que você deseja restaurar:
sudo bash deploy/tor/deploy.sh --rollback 20260912T153000.123456789Z
```

Usa o mesmo lock, troca atômica e teste HTTP; se o alvo falhar, volta ao symlink
que estava ativo antes do rollback. Não altera checkout, build ou endereço Onion.

## 6. Backup da identidade (segredo permanente)

**Nunca apague `/var/lib/tor/miguelzacca-onion/`, nem em deploy, rebuild, update,
remoção parcial ou manutenção. Suas chaves privadas são secretas: nunca as
commite, coloque dentro do checkout, publique, cole em mensagens ou imprima em
logs. Quem obtiver a chave privada pode se passar pelo seu Onion Service.**

No C Tor v3 usado aqui, preserve apenas `hs_ed25519_secret_key` e
`hs_ed25519_public_key`. A chave secreta define a identidade; o par é suficiente
para restaurá-la, e `hostname` será regenerado. Não copie todo `/var/lib/tor`,
`dist/`, releases, cache de rede ou o repositório para esse backup de identidade.
Não há autorização de clientes configurada neste serviço público.

Em uma máquina administrativa confiável, com GnuPG e armazenamento cifrado,
rode o comando abaixo **fora de qualquer repositório**. O tar transmite somente
as duas chaves pelo SSH e o GPG grava um backup cifrado; não use `tar -v`, `tee`,
`set -x` ou senha literal na linha de comando. O SSH precisa aceitar `sudo -n`
na VPS (padrão comum do usuário `ubuntu`); se não aceitar, prepare o acesso sudo
administrativo antes, sem alocar um pseudo-TTY para o fluxo binário.

```bash
set -o pipefail
umask 077
ssh -i ~/.ssh/SUA_CHAVE ubuntu@IP_DA_VPS \
  'sudo -n tar -C /var/lib/tor/miguelzacca-onion -cf - hs_ed25519_secret_key hs_ed25519_public_key' \
  | gpg --symmetric --cipher-algo AES256 --output onion-identity.tar.gpg
```

Guarde o arquivo cifrado e a senha em locais seguros separados; verifique o exit
status do pipeline e teste a leitura com `gpg --decrypt onion-identity.tar.gpg |
tar -tf -` (lista nomes, sem mostrar o conteúdo). Se o pipeline falhar, o arquivo
resultante não deve ser considerado um backup válido. Não faça commit nem mesmo
do backup cifrado. O endereço em `hostname` pode ser anotado separadamente para
comparação depois da restauração. O Tor Project descreve a necessidade de manter
as chaves privadas no [guia de Onion Services](https://community.torproject.org/onion-services/setup/).

Para migrar preservando o endereço, restaure **antes do primeiro bootstrap** da
nova VPS e deixe a instância antiga parada durante a ativação da substituta:

```bash
# Na nova VPS, preparar o destino vazio (não reutilize uma identidade existente):
sudo install -d -m 0700 /var/lib/tor/miguelzacca-onion
sudo test ! -e /var/lib/tor/miguelzacca-onion/hs_ed25519_secret_key

# Na máquina administrativa, fora do repo, para uma VPS nova e vazia:
set -o pipefail
gpg --decrypt onion-identity.tar.gpg \
  | ssh -i ~/.ssh/SUA_CHAVE ubuntu@IP_DA_NOVA_VPS \
    'sudo -n tar --keep-old-files --no-same-owner -xf - -C /var/lib/tor/miguelzacca-onion hs_ed25519_secret_key hs_ed25519_public_key'

# Na nova VPS: bootstrap ajusta dono/permissões sem modificar o conteúdo das chaves.
sudo bash deploy/tor/bootstrap.sh
sudo bash deploy/tor/deploy.sh
sudo cat /var/lib/tor/miguelzacca-onion/hostname
```

Compare o hostname com o endereço anotado. Nunca sobrescreva chaves de uma
instância existente para testar a restauração e nunca remova o diretório de
identidade para resolver um erro. Para parar temporariamente, use
`sudo systemctl stop miguelzacca-onion-tor.service miguelzacca-onion-nginx.service`;
os diretórios persistem. Não há script de uninstall que os remova.

Referências de configuração: [validação e opções do Nginx](https://nginx.org/en/docs/switches.html)
e [manual Tor no Ubuntu (`--verify-config`)](https://manpages.ubuntu.com/manpages/noble/man1/tor.1.html).
