# Reconstrução — engenharia de produto em movimento

## Ponto de partida / 12 de setembro de 2026

Repositório confirmado: `miguelzacca/miguelzacca`, pacote `miguel-zacca-portfolio`, HEAD inicial `f4549f2`. Worktree único e limpo. Branch de trabalho: `redesign/product-in-motion`. Não foi encontrado AGENTS.md no projeto nem nos diretórios ancestrais consultados. Nenhum repositório do aplicativo Conectei foi aberto ou modificado.

HTML, CSS e JavaScript estáticos; Three.js 0.185.1, esbuild, ESLint, Playwright e axe existentes. O monograma anterior é geometria procedural de oito membros extrudados em `scene.js`, empacotada em `assets/signature.js`, com alternativa SVG. Não é vídeo nem imagem fingindo ser WebGL. Fontes Manrope e Instrument Serif hospedadas localmente.

A inspeção inicial no Chromium confirmou que a abertura excedia uma janela comum antes de apresentar a descrição e o CTA. A sequência tinha muitos títulos metafóricos, telas distantes de suas justificativas e engenharia organizada por nomes de repositório. Capturas comparáveis preservadas em `.tmp-redesign/before`.

## Direção

Um portfólio de quem constrói produto: papel quente, verde tinta, superfícies metálicas e linhas de construção. Tipografia editorial com escala controlada. A identidade e o próximo passo cabem na abertura. O case explica decisões por meio de telas; a engenharia permite explorar responsabilidades. Trechos de leitura estáveis intercalam os momentos de movimento.

Primeira fatia: abertura, ligação gráfica entre disciplinas, contexto do case e pesquisa imobiliária. Foi capturada em `.tmp-redesign/slice`, inspecionada e ajustada antes de completar o restante. Depois da nova orientação do autor, a passagem contínua do monograma foi novamente revisada em `.tmp-redesign/journey-slice` e `.tmp-redesign/journey-mobile` antes das capturas finais.

## Fontes e limites editoriais

- `README.md` local: fonte principal autorizada de produto, responsabilidades, tecnologias, decisões de segurança e operação; conteúdo preservado, com atualização pontual de 600K+ para 750K+ LOC conforme informação do autor nesta conversa.
- [README público atual](https://raw.githubusercontent.com/miguelzacca/miguelzacca/main/README.md), acessado em 12/09/2026: confirma apresentação pública da Conectei. A versão raw atual foi preferida ao perfil indexado antigo.
- [Site público da Conectei](https://conecteimob.com.br), acessado em 12/09/2026: contexto de captação, público, pesquisa, CRM, carteira, precificação e continuidade do atendimento. Não usamos avaliações, números de clientes ou métricas comerciais.
- `assets/product-*.webp`: capturas existentes descritas no README como interfaces reais com dados demonstrativos. Inspecionadas visualmente; não são protótipos produzidos para o redesign.
- `index.html` anterior: identificação profissional e canais existentes. Links para o GitHub são identificados como perfil, sem prometer uma caixa de mensagens inexistente.
- [Perfil do GitHub](https://github.com/miguelzacca): a página indexada apresenta formação antiga e outro endereço de portfólio. Não sustenta uma afirmação de formação atual. Nenhuma foto foi usada.

`miguelzacca.dev` não pôde ser lido pela ferramenta web (erro de acesso). Uma verificação posterior por HTTP obteve status 200. As capturas comparáveis de antes e depois são do checkout local.

Não há evidência suficiente para datas de trajetória, anos de experiência, formação atual, clientes, receita, adoção ou impacto quantificado. O estado do produto em operação é documentado; os resultados apresentados são capacidades entregues. Explicações de vantagens e compromissos arquiteturais são leituras das responsabilidades descritas publicamente, não relatos inventados de incidentes ou benchmarks internos.

## Informações autorizadas durante a reconstrução

O usuário autorizou explicitamente a divulgação de WhatsApp Business pessoal `+55 47 99743-1069`, `contato@conecteimob.com.br`, Instagram pessoal `@mz_miguelzacca` e Instagram da Conectei `@conectei.imob`. Os destinos foram normalizados, rotulados e incorporados ao contato e ao menu móvel. Não foi enviada mensagem a nenhum canal.

O usuário atualizou o volume para **mais de 750 mil LOC efetivos** e pediu destaque. O site dá ênfase a esse número na seção de engenharia e indica data, escopo e atribuição ao autor. A contagem não foi refeita em código privado, nem é usada como prova automática de qualidade.

Os quatro links anteriores para `conecteimob/conecteimob`, `evo`, `mailer` e `task` retornaram 404 em acesso público sem autenticação. Foram retirados da navegação e substituídos pela documentação pública do perfil. O check de build acompanha essa mudança, preservando os destinos públicos válidos e verificando também os canais autorizados. Nenhum conteúdo privado desses repositórios foi lido.

## Revisão crítica da primeira versão completa

- Abertura antes: proposta e CTA abaixo da dobra no notebook. Agora: identificação, descrição concreta e os dois próximos passos na mesma janela.
- A Conectei deixou de ser uma coleção de funcionalidades e nomes de repositórios: três recortes explicam decisões de produto/experiência; o mapa mostra limites e compromissos técnicos.
- As três experiências têm mecanismos diferentes: montagem geométrica, sequência de planos do produto e seleção de relações. Mantêm leitura estável entre elas.
- Corrigidos contraste do rótulo de engenharia e espaço vertical dos controles do mapa mobile. Texto de leitura móvel ampliado após as capturas.
- Substituída a imagem social da Conectei por uma peça de identidade pessoal; canal GitHub passou a ser corretamente identificado como perfil.
- Permanecem lacunas de trajetória pessoal e de resultados comerciais verificáveis. Nenhum bloco público usa placeholder ou biografia fictícia.

## Correção da coreografia após orientação do autor

A primeira reconstrução restringia o monograma à abertura. O autor esclareceu que ele deveria acompanhar a página inteira, desmontando, virando moldura e se reconstruindo. A cena foi então transformada em uma única construção contínua, com sete formações de oito membros, medidas do documento e reversão pela rolagem nativa. Os espaços da transição, capacidades, Sobre e contato foram recompostos para recebê-la.

As capturas revelaram ajustes concretos: legendas precisavam se separar dos membros da moldura; o palco precisava comportar imagem, legenda e navegação; a assinatura final não precisava competir com outro nome gigante no rodapé. O movimento móvel usa os limites das capturas verticais e intervalos próprios. Conteúdo, canais autorizados e destaque aos 750 mil+ LOC permanecem presentes.

## Abertura sem flash do monograma montado

O autor relatou que o SVG montado aparecia antes do carregamento da animação. O estado `signature-pending` agora é aplicado antes do primeiro paint em movimento normal. O conteúdo e a composição permanecem visíveis; apenas o monograma aguarda o primeiro quadro. A cena recebe explicitamente a pose desmontada antes de `resize` agendar seu primeiro render. Sucesso remove o estado de espera; falha de módulo/WebGL restaura a imagem estática. Sem JavaScript ou com movimento reduzido inicial, a imagem estática está disponível imediatamente.

O teste de regressão retém a resposta do módulo gráfico por 1,2 segundo e verifica que o primeiro render tem progresso zero, de desmontado para montado. Uma gravação separada simula 1,7 segundo de atraso para revisão visual da abertura.
