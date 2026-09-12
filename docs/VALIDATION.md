# Desenvolvimento e validação

Site estático em HTML, CSS e JavaScript. A infraestrutura existente foi mantida: Three.js, esbuild, ESLint, Playwright, axe e hospedagem estática pela configuração atual da Vercel. Nenhuma dependência de runtime foi adicionada. Push e abertura de PR foram autorizados pelo autor ao final da reconstrução. Não houve deploy em produção nem merge.

## Rodar e verificar

```text
npm ci
npx playwright install chromium
npm run dev
npm run check
```

No PowerShell, se necessário, use `npm.cmd` / `npx.cmd`. A prévia local fica em `http://127.0.0.1:4173`. `npm run preview` serve o build de `dist`. `npm run build:scene` recompila apenas a geometria.

`npm run check` executa lint, build e testes. O build também verifica assets, âncoras, IDs, H1, idioma, canonical, JSON-LD e destinos públicos obrigatórios. Robots e sitemap foram conferidos; a URL pública continua `https://miguelzacca.dev/` e o lastmod foi atualizado para 12/09/2026.

Formatação dos arquivos alterados verificada com Prettier 3.9.6 via `npx`, sem adicioná-lo à aplicação. `git diff --check` não encontrou erros de whitespace.

Resultado da suíte completa após as correções: **35 testes aprovados**, em 4,3 minutos, com lint e build concluídos. Ao final, o autor solicitou `npx prettier --write .` antes do commit e PR. `.prettierignore` exclui apenas outputs gerados, dependências e evidências temporárias; o bundle gráfico continua produzido pelo esbuild.

## Cobertura de navegador

35 testes cobrem:

- 1920 × 1080, 1440 × 1000, 1366 × 768, 1366 × 600, 834 × 1112, 390 × 844, 320 × 740 e 844 × 390.
- Conteúdo e headings legíveis, overflow horizontal, recursos e erros de console.
- Proposta, identificação e os dois CTAs inteiros na primeira janela de notebook.
- Menu com Tab/Shift+Tab, Escape, confinamento de foco, retorno ao gatilho e recuperação após resize.
- Capturas ampliadas, foco devolvido ao acionador e imagens mobile com contexto de toque real emulado pelo navegador.
- Avanço e retorno nas três etapas do case; os mesmos elementos de imagem voltam aos artigos ao mudar de breakpoint ou reduzir a altura.
- Continuidade do mesmo canvas e reversão em notebook, tablet, celular e janela baixa; moldura alinhada ao elemento real de imagem.
- Download gráfico atrasado: nenhum flash do SVG montado e primeiro quadro WebGL na pose desmontada. Falha do módulo principal restaura a alternativa estática.
- Janelas móveis muito baixas adiam a importação gráfica até a escultura entrar no viewport. Bloquear a coreografia preserva case, LOC e contatos no HTML.
- Seleção da engenharia por clique, toque, foco e setas; deep link para um painel; axe em cada responsabilidade.
- JavaScript ausente/bloqueado, módulo gráfico bloqueado, WebGL indisponível e perda de contexto.
- Preferência de movimento reduzido inicial e alterada durante a visita. Com preferência inicial reduzida, Three.js não é baixado.
- Cena sem frames contínuos após acomodar, em aba oculta, fora da área ativa e após descarte.
- Axe WCAG A/AA no desktop e mobile; conteúdo essencial em HTML, independentemente de WebGL.

Durante a revisão, foram corrigidos um contraste abaixo de 4,5:1, sobreposição da instrução no mapa móvel e a navegação entre os extremos do menu. Uma execução concorrente à captura visual atingiu o timeout do teste de lifecycle; a validação final é executada separadamente das capturas e das medições.

Na coreografia contínua, foram separados os intervalos das molduras em telas inline: uma janela alta pode conter duas capturas sem a entrada da segunda ultrapassar a saída da primeira. Legendas ganharam espaço em relação aos membros metálicos. O flash inicial relatado pelo autor foi corrigido com um estado anterior ao primeiro paint e preparação da pose antes do primeiro render. O teste segura o download por 1,2 segundo e verifica a ausência do SVG montado nesse intervalo.

## Evidências visuais

As capturas usam o checkout local antes e depois, nas mesmas dimensões. Os arquivos em `.tmp-redesign` são preservados localmente e ignorados pelo Git; os scripts para reproduzi-los estão versionados.

| Recorte              | Antes                                                          | Depois                                                            |
| -------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------- |
| Notebook, 1366 × 768 | [Abertura anterior](../.tmp-redesign/before/notebook-hero.png) | [Nova abertura](../.tmp-redesign/journey-final/notebook-hero.png) |
| Mobile, 390 × 844    | [Abertura anterior](../.tmp-redesign/before/mobile-hero.png)   | [Nova abertura](../.tmp-redesign/journey-final/mobile-hero.png)   |
| Página no notebook   | [Página anterior](../.tmp-redesign/before/notebook-full.png)   | [Nova página](../.tmp-redesign/journey-final/notebook-full.png)   |
| Página no mobile     | [Página anterior](../.tmp-redesign/before/mobile-full.png)     | [Nova página](../.tmp-redesign/journey-final/mobile-full.png)     |

Outros recortes: [contexto do case](../.tmp-redesign/journey-final/notebook-case.png), [pesquisa](../.tmp-redesign/journey-final/notebook-pesquisa.png), [rotina](../.tmp-redesign/journey-final/notebook-rotina.png), [precificação](../.tmp-redesign/journey-final/notebook-precificacao.png), [engenharia](../.tmp-redesign/journey-final/notebook-engenharia.png), [contato móvel](../.tmp-redesign/journey-final/mobile-contato.png).

[Percurso gravado — WebM, 1366 × 768](../.tmp-redesign/tour-journey/portfolio-tour.webm). Inclui montagem/separação do monograma, passagem e retorno entre telas, seleção de responsabilidades e encerramento. A gravação é codificada a 25 fps; isso não é uma medição de FPS do site. Quadros do vídeo foram extraídos e inspecionados para confirmar a captura do case e do mapa.

```text
node tools/visual-review.mjs journey-final
node tools/record-tour.mjs tour-journey
node tools/measure-performance.mjs performance-journey
node tools/record-opening.mjs
node tools/build-social.mjs
```

Esses comandos exigem o servidor local ativo. O script de capturas pode ser executado com outro nome de fase para não substituir evidências anteriores. Capturas de página inteira não mostram todos os estados de um elemento sticky; consulte os recortes por etapa e o vídeo.

## Performance medida

12/09/2026, Chromium 153 no Windows, renderização WebGL por software (SwiftShader), HTTP local sem compressão, cache frio, três navegações por perfil. Desktop: 1366 × 768, sem limitação artificial de rede/CPU. Mobile: 390 × 844, 1,6 Mbps download, 750 Kbps upload, 150 ms de latência e CPU 4× mais lenta via CDP.

| Métrica                                        | Desktop local   | Mobile simulado     |
| ---------------------------------------------- | --------------- | ------------------- |
| FCP / LCP mediano                              | 344 ms / 344 ms | 1.816 ms / 1.816 ms |
| Intervalo de LCP                               | 332–672 ms      | 1.472–1.884 ms      |
| CLS                                            | 0               | 0,0000785           |
| Bytes transferidos por navegação               | 899.426         | 749.032             |
| Requests                                       | 13              | 10                  |
| Maior tarefa nos primeiros 5 s                 | 485 ms          | 458 ms              |
| Excesso sobre 50 ms em tarefas longas, mediana | 684 ms          | 380 ms              |

A última linha é uma observação de tarefas longas, não TBT do Lighthouse nem INP de campo. O custo de inicialização gráfica é uma limitação real registrada. O conteúdo aparece antes da cena. Em movimento normal, o monograma aguarda invisível pelo primeiro quadro desmontado; em movimento reduzido ou sem JavaScript, a alternativa SVG aparece imediatamente. A navegação não depende da animação.

No snapshot medido, `assets/signature.js` tem 533,4 KiB brutos e 112,4 KiB com Brotli calculado localmente. O servidor de desenvolvimento não aplica essa compressão: os bytes transferidos acima são maiores que esses tamanhos comprimidos. Não foi medida a entrega em produção nem coletada pontuação Lighthouse.

[Resultados brutos e condições](../.tmp-redesign/performance-journey/lab.json). Não houve medição em GPU/celular físico, Safari ou Firefox. Axe e Chromium não substituem revisão humana e testes com leitores de tela reais.

## Conteúdo, links e limites

[Fontes, autorizações e lacunas](RECONSTRUCTION.md) e [direção/momentos de movimento](ART_DIRECTION.md).

Conectei, perfil e README do GitHub, ambos os Instagrams e WhatsApp responderam HTTP 200 (WhatsApp redireciona para o endpoint público de abertura de conversa). O e-mail foi conferido como `mailto:`. Não foram enviados e-mails ou mensagens nem exigido login em contas sociais. Os quatro links antigos para repositórios retornaram 404 em acesso público e foram substituídos pela documentação pública acessível.

750 mil+ LOC é dado informado pelo autor, contextualizado em setembro de 2026; não houve contagem em repositórios privados. Trajetória anterior, formação atual e resultados comerciais continuam sem fonte suficiente e não foram inventados.

[Abertura corrigida com download gráfico atrasado](../.tmp-redesign/opening-fixed/opening.webm): o monograma aguarda pelo primeiro quadro desmontado. [Recortes versionados para o PR](review/README.md) complementam as capturas locais de antes e depois.
