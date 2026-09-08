# Engenharia em movimento

O portfólio continua sendo de Miguel Zacca, Product Engineer e criador da Conectei. O princípio visual é o mesmo princípio de trabalho: partes distintas precisam se entender para produzir um todo útil.

## Três momentos

1. **Complexidade, em boa forma.** Papel quente, tipografia editorial em três planos e uma construção de oito membros extrudados. O M e o Z aparecem incompletos, em profundidades diferentes. Grafite, alumínio acetinado e fixações de latão retomam a identidade existente.
2. **Quando as partes se conectam.** A estrutura atravessa a mudança cromática e se reorganiza como abertura para a Conectei. A moldura WebGL e a superfície DOM do produto compartilham posição e escala. O restante do case mostra telas reais, decisões, fluxo e responsabilidades do ecossistema.
3. **Vamos dar forma?** O mesmo conjunto fecha o MZ ao lado de um convite simples. A conclusão recupera a assinatura, o nome e o papel profissional de Miguel.

## Movimento

- Scroll nativo, sem captura de wheel, touch ou teclado e sem trechos de rolagem fixada obrigatória.
- Uma cena WebGL transparente compartilhada entre os capítulos; texto e links são HTML.
- Abertura: atribuição, três linhas com máscaras tipográficas, depois convite. Nenhum preloader.
- Gramática DOM: curva `cubic-bezier(.22,1,.36,1)`, entradas entre 700–1150 ms; linhas, máscaras, deslocamento lateral curto e mudanças de opacidade têm papéis distintos.
- Interação: ponteiro normal, alvos imóveis, setas e linhas que indicam direção. Amortecimento da escultura limitado a poucos graus.
- O mobile segue a posição real dos elementos no documento; reorganiza a estrutura em um intervalo próprio antes do produto. A interface permanece reta e usa os screenshots mobile originais.
- Reduced motion: composição estática em cada momento, sem parallax e sem sequência obrigatória. A mudança da preferência durante a visita é observada.

## Implementação

- `index.html`: conteúdo indexável, navegação, imagens reais, metadados e JSON-LD.
- `styles.css`: tokens de papel/grafite/latão, tipografia local, composição e breakpoints.
- `script.js`: navegação, visualizador de imagens, medidas do documento e timeline de scroll. Nenhuma atualização de framework por frame.
- `scene.js`: geometria procedural, materiais, luz, morph e lifecycle Three.js; `assets/signature.js` é o bundle local gerado e serve diretamente no hosting estático existente.
- `assets/signature-fallback.svg`: interpretação vetorial da mesma construção para carregamento inicial ou falha de WebGL.

O conteúdo não é ocultado por CSS à espera de JavaScript. As animações usam Web Animations sem deixar estado final invisível. Sem script, o menu mobile usa `details`, imagens continuam sendo links para os arquivos originais e os números já têm valores finais.

Renderização limitada por DPR, sem pós-processamento, com sombras simplificadas conforme capacidade. A cena repousa depois de acomodar o movimento, suspende trabalho fora dos momentos relevantes ou em aba oculta e descarta seus recursos ao sair. Fontes, geometria e imagens não dependem de CDN em runtime.

## Conteúdo e limites

Todos os destinos externos anteriores permanecem. Nenhum contato, projeto, cliente ou resultado foi inventado. As telas fornecidas usam dados demonstrativos; os números de engenharia estão contextualizados como snapshot de setembro de 2026. O README público original da Conectei foi preservado.

Comandos e evidências de verificação: [VALIDATION.md](VALIDATION.md). Nenhuma publicação, merge ou alteração remota é realizada pelos comandos locais.
