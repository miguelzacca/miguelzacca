# Desenvolvimento e validação

O portfólio continua sendo um site estático em HTML, CSS e JavaScript, hospedado na Vercel. A etapa de compilação transforma `scene.js` e o Three.js em `assets/signature.js`, um módulo local, e prepara os arquivos públicos em `dist`. Não há migração de framework.

`vercel.json` configura explicitamente `npm run build` e a saída `dist`, com preset de framework `Other` (`null`). A Vercel entrega esse artefato estático; o WebGL e as interações executam no navegador. `tools/serve.mjs` é apenas um servidor de desenvolvimento local: não é enviado em `dist`, não é uma Function e não exige VPS, porta exposta ou processo persistente em produção. O portfólio não requer backend ou variáveis de ambiente.

As fontes Manrope e Instrument Serif também são locais, em `assets/fonts`. Seus arquivos WOFF2 vêm da distribuição oficial do Google Fonts; licenças OFL, URLs de origem e hashes acompanham os arquivos. `node tools/fetch-fonts.mjs` reproduz o download das mesmas versões.

## Comandos

Requer Node.js 20.19 ou mais recente e npm. No PowerShell com execução de scripts desabilitada, use `npm.cmd` e `npx.cmd`.

```text
npm ci
npx playwright install chromium
npm run dev
```

O servidor local abre em `http://127.0.0.1:4173`. Para regenerar a cena durante o desenvolvimento, execute `npm run build:scene`.

```text
npm run lint
npm run build
npm test
```

O build verifica arquivos locais, destinos originais, âncoras, IDs, heading principal, canonical, JSON-LD e valores finais de contadores antes de copiar os arquivos estáticos para `dist`. Use `npm run preview` para servir esse diretório. `npm run check` executa lint, build e testes em sequência.

## Cobertura automatizada

- Chromium em 1920, 1440, 1280, 834, 390 e 320 pixels, além de orientação horizontal de celular.
- Conteúdo legível e ausência de overflow horizontal em todos os capítulos.
- Recursos locais, imagens reais e erros de execução/console.
- Menu por teclado, Escape, navegação e liberação de foco/scroll após redimensionamento.
- Contexto móvel com ponteiro coarse e toque real do navegador, abertura de detalhes, imagens e mudança de orientação.
- Ampliação das capturas reais do produto e retorno de foco.
- Âncoras diretas, scroll reverso, posição restaurada e redimensionamento.
- JavaScript desabilitado, falha de carregamento do script principal e do módulo 3D.
- Ausência de WebGL, perda de contexto e fallback estático.
- Preferência de movimento reduzido alterada durante a visita.
- Cena sem frames contínuos depois de acomodar a interação, fora da tela, com aba oculta e após descarte.
- Axe com critérios automatizáveis de WCAG A/AA em desktop e celular.

Os testes armazenam capturas por viewport e quadros da transição em `test-results`. Falhas preservam screenshot e trace. O relatório HTML fica em `playwright-report`.

## Última execução

Em 8 de setembro de 2026, `npm run check` concluiu com sucesso: lint, build e **21 testes passaram**, em aproximadamente 2,6 minutos de execução do navegador. O conjunto inclui os ajustes finais de composição, transição móvel, fontes locais, links das imagens e pausa da cena após acomodação. As duas auditorias axe não encontraram violações nos critérios automatizados selecionados.

As capturas finais de 1440 e 390 pixels e do contexto com toque foram preservadas em `.tmp-final-qa`, além dos resultados normais do Playwright. O build em `dist` inclui a licença MIT completa do Three.js e as licenças OFL das fontes.

## Limites

Os checks automatizados usam Chromium com renderização WebGL por software para reprodutibilidade. Eles não medem fluidez numa GPU ou celular físico, nem substituem inspeção visual e navegação manual. Axe cobre somente critérios que consegue verificar automaticamente. Nenhum comando de desenvolvimento ou teste publica o site em produção.
