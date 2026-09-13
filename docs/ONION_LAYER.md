# A última camada do portfólio

Experiência adicionada depois do contato e da assinatura, imediatamente antes do footer. Prévia local: `http://127.0.0.1:4173/#outra-rota`. A capa `assets/onion-cover.svg` destaca a seção correspondente no README, sem ser carregada pela landing page.

## Direção e copy

O dourado do contato se dissolve em preto esverdeado. Manrope e Instrument Serif continuam a identidade editorial; metadados monoespaçados, planos isométricos em SVG e linhas finas introduzem a rota alternativa. O diagrama é conceitual, não uma representação de um circuito Tor real. No celular, ele precede o console e os controles ocupam toda a largura. O footer existente retorna à superfície clara.

> Você chegou ao fim da superfície.
>
> Quer ver meu portfólio de ex-hacker?
>
> Sim, eu coloquei meu portfólio na rede Tor. Mesmo trabalho. Outra rota.

O guia fecha com **“Nunca usou Tor?”** e **“Sem terminal. Sem ritual.”**: baixar, abrir e conectar, colar o endereço. Não há biografia nova, história de invasão nem promessa de anonimato.

## Implementação

- HTML essencial disponível sem JavaScript; botão de cópia aparece apenas quando seu comportamento está instalado.
- `script.js` usa seu AbortController e seu descarte existentes. Clipboard API, fallback por seleção temporária e, se ambos forem bloqueados, seleção manual com instrução acessível. Confirmação com `role="status"`, sem deslocar o layout.
- IntersectionObserver por elemento. Entradas CSS únicas, stagger de linhas, varredura discreta sobre o endereço real e três ciclos do cursor. Efeitos pausam fora da viewport e em aba oculta; não há loop JavaScript adicional. Movimento reduzido desativa todas as novas animações, inclusive quando a preferência muda durante a visita.
- O texto do endereço nunca é embaralhado ou substituído. O painel é um manifesto editorial estático, sem request, sondagem ou health-check para o Onion.
- `journey.js` conserva o término original da escultura usando o limite do contato e a altura do footer. Após esse ponto, a assinatura sai com o documento e a cena deixa de renderizar. Nenhum modelo, shader, material ou formação foi alterado.

## Destinos e preservação

Endereço utilizado, inclusive no clipboard:

`http://hdwlsilq4x73cpco4wpn73tylmfuswdfzrlk5wisgu247wff3om7emad.onion`

O download originalmente solicitado em `/pt-BR/download/` retornou 404. O autor aprovou o endereço oficial atual, [download.torproject.org](https://download.torproject.org/), também indicado na [documentação de instalação](https://support.torproject.org/tor-browser/getting-started/installing/). Ambos responderam HTTP 200 na validação. A documentação confirma a ausência de Tor Browser oficial para iOS e recomenda Onion Browser. Todos os novos links externos usam `target="_blank"` e `rel="noopener noreferrer"`.

Comparação com o HEAD anterior, normalizando apenas CRLF/LF: `<head>` completo, todo o HTML anterior à nova seção, footer e prefixo do README preservados. `vercel.json`, `deploy/tor/`, `sitemap.xml`, `robots.txt`, `package.json`, `package-lock.json` e `scene.js` sem alterações. Canonical e `og:url`: **https://miguelzacca.dev/**. Nenhum `.onion` no sitemap, nenhum redirect para Tor e nenhuma nova dependência.

## Revisão visual

Capturas com Chromium, rolagem nativa, movimento normal e fontes locais carregadas. Cada viewport tem recortes da transição, abertura, console e guia, além da seção completa. As evidências locais são ignoradas pelo Git.

| Viewport    | Abertura                                                   | Console                                                   | Guia                                                    | Seção completa                                            |
| ----------- | ---------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------- |
| 1440 × 900  | [PNG](../.tmp-redesign/onion-first/1440x900-entrance.png)  | [PNG](../.tmp-redesign/onion-first/1440x900-console.png)  | [PNG](../.tmp-redesign/onion-first/1440x900-guide.png)  | [PNG](../.tmp-redesign/onion-first/1440x900-section.png)  |
| 1920 × 1080 | [PNG](../.tmp-redesign/onion-first/1920x1080-entrance.png) | [PNG](../.tmp-redesign/onion-first/1920x1080-console.png) | [PNG](../.tmp-redesign/onion-first/1920x1080-guide.png) | [PNG](../.tmp-redesign/onion-first/1920x1080-section.png) |
| 390 × 844   | [PNG](../.tmp-redesign/onion-first/390x844-entrance.png)   | [PNG](../.tmp-redesign/onion-first/390x844-console.png)   | [PNG](../.tmp-redesign/onion-first/390x844-guide.png)   | [PNG](../.tmp-redesign/onion-first/390x844-section.png)   |
| 375 × 812   | [PNG](../.tmp-redesign/onion-first/375x812-entrance.png)   | [PNG](../.tmp-redesign/onion-first/375x812-console.png)   | [PNG](../.tmp-redesign/onion-first/375x812-guide.png)   | [PNG](../.tmp-redesign/onion-first/375x812-section.png)   |

Reprodução: `node tools/review-onion.mjs nome-da-revisao`, com `npm run dev` ativo. As capturas mantêm a navegação original, a tipografia editorial e os endereços legíveis, sem overflow nas quatro dimensões.

## Verificação automatizada

- `npm ci`: concluído, zero vulnerabilidades reportadas.
- `npm run lint`: aprovado.
- `npm run build`: aprovado, `dist/` gerado e verificado. Bundle Three.js preservado em 533,4 KiB brutos.
- Prettier nos arquivos de código alterados e `git diff --check`: aprovados.
- **44 casos validados**: 35 existentes e nove novos. A execução completa de `npm test` teve 38 aprovações; três testes novos inicialmente usavam um seletor pelo texto que mudava ao copiar, e três testes preexistentes de WebGL ultrapassaram o limite global de 30 s, sem falha de suas verificações de estado. O seletor foi corrigido. Os seis casos afetados e o cenário de cópia manual passaram na reexecução abaixo (sete aprovados, 2,4 minutos). O limite ampliado se aplica apenas a esse comando; `playwright.config.js` permanece intacto.

```sh
npm test -- --grep 'at 1366x768|at 1366x600|anchors, scroll reversal|copies|clipboard methods' --timeout=60000
```

Os novos testes verificam o endereço e o clipboard byte por byte, Clipboard API real, fallback com API ausente e com permissão negada, seleção manual quando ambos os métodos falham, confirmação e retorno do botão, Tab/Space/Enter e foco visível, ausência de requests para `.onion`, URLs oficiais e metadados. Também cobrem movimento reduzido inicial/dinâmico, pausa fora da viewport, término das animações, conteúdo sem JavaScript e continuidade/saída/reversão da escultura.

Sem overflow do documento ou dos fragmentos de texto do endereço em **320, 375, 390, 430, 768, 1024, 1440, 1920 e 2560 px**. Todos os novos links/botões têm alvo mínimo de 44 × 44 px. Axe WCAG A/AA: **zero violações** na nova seção e na página completa, em desktop e mobile.

## Performance comparada

Mesmo script `tools/measure-performance.mjs`, três navegações com cache frio por perfil, servidor HTTP local sem compressão, Chromium 153/Windows com SwiftShader. Mobile: 390 × 844, latência de 150 ms, download de 1,6 Mbps, upload de 750 Kbps e CPU 4×. A medição final rodou depois dos testes, sem capturas simultâneas.

| Métrica (mediana)                              |     Antes |    Depois |
| ---------------------------------------------- | --------: | --------: |
| LCP desktop local                              |    312 ms |    180 ms |
| LCP mobile simulado                            |  1.656 ms |  1.932 ms |
| CLS desktop                                    |         0 |         0 |
| CLS mobile                                     | 0,0000785 | 0,0000785 |
| Requests desktop / mobile                      |   13 / 10 |   13 / 10 |
| Bytes transferidos desktop                     |   908.454 |   935.934 |
| Bytes transferidos mobile                      |   758.060 |   785.540 |
| Excesso sobre 50 ms em tarefas longas, desktop |    881 ms |    565 ms |
| Excesso sobre 50 ms em tarefas longas, mobile  |    486 ms |    195 ms |

O LCP mobile aumentou **276 ms (16,7%)** neste cenário sem compressão; o CLS e o número de requests ficaram iguais. A experiência acrescenta aproximadamente **5,3 KiB com Brotli calculado localmente**, incluindo a pequena mudança em `journey.js`. Não há nova dependência, WebGL adicional ou renderização JavaScript contínua. O teste de lifecycle confirma que a cena existente continua parando fora da área ativa e após acomodar.

Os resultados não indicam regressão severa neste ensaio, mas variam com o ambiente: o primeiro desktop anterior teve LCP de 4.532 ms, enquanto as duas outras navegações ficaram em 312 e 240 ms. A redução das medianas desktop/tarefas longas não deve ser atribuída à nova seção. Esta é uma medição de laboratório com PerformanceObserver/CDP, não uma pontuação Lighthouse, INP de campo ou validação em celular físico/Safari/Firefox.

Resultados e condições brutos: [antes](../.tmp-redesign/onion-before-performance/lab.json), [depois](../.tmp-redesign/onion-after-performance/lab.json).
