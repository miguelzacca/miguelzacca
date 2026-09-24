# SEO, AEO e conteúdo público para agentes

O HTML da Surface Web é a fonte do conteúdo da landing. `content/profile.json`
concentra a identidade, biografia, contatos, resumo do produto e data de revisão.
O README continua sendo a documentação pública detalhada da Conectei.

## Atualização

1. Atualize o texto público em `index.html` e a documentação da Conectei em `README.md`.
2. Quando necessário, atualize `content/profile.json`, inclusive a data real da revisão.
3. Execute `npm run seo:generate` e inclua os arquivos gerados no commit.
4. Execute `npm run lint`, `npm run build` e `npm run test:seo`.

O gerador altera somente a região marcada no `<head>` do HTML e a introdução
marcada do README. Não altera o corpo, o CSS, imagens, animações ou navegação da
landing. Os contatos são conferidos contra os links visíveis; divergências
interrompem o build. O build regenera e publica os arquivos; o CI também verifica
se as versões commitadas estão sincronizadas antes do build.

| Endereço | Conteúdo |
| --- | --- |
| `/` | Landing HTML com metadados e JSON-LD embutido |
| `/index.md` | Perfil, contatos e conversão do conteúdo real da landing |
| `/llms.txt` | Índice curto com contexto e links para agentes |
| `/llms-full.txt` | Portfólio e documentação pública detalhada da Conectei |
| `/README.md` | README público com biografia e contatos sincronizados |
| `/profile.jsonld` | Mesmo grafo JSON-LD embutido no HTML |
| `/sitemap.xml` | Apenas a URL canônica HTML da Surface Web |

HTML e headers HTTP anunciam Markdown com `rel="alternate"` e o índice com
`rel="describedby"`. `Accept: text/markdown` em `/` ou `/index.html` retorna
`index.md`, com `Vary: Accept`; listas de preferências ou `q=0` conservam HTML.
Os arquivos explícitos sempre funcionam, independentemente de negociação.
`tools/seo-routes.mjs` gera as regras da Vercel e orienta o servidor local.

O robots.txt permite crawling. Os arquivos de agentes complementam o HTML, sem
troca de conteúdo por User-Agent, FAQ invisível, avaliações fictícias ou promessa
de ranking/citação. A chamada de ex-hacker já faz parte da landing. O portfólio
Onion e sua infraestrutura não são fontes de conteúdo deste gerador.

## Referências

- [Google: recursos de IA e seu site](https://developers.google.com/search/docs/appearance/ai-features)
- [Proposta llms.txt](https://llmstxt.org/)
- [Schema.org: ProfilePage](https://schema.org/ProfilePage)
- [Vercel: configuração de rotas](https://vercel.com/docs/project-configuration/vercel-json)
