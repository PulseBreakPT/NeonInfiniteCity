# ATLAS.IO — conquista o mundo real

Jogo original de conquista territorial inspirado no género arcade de captura de áreas (Paper.io) e crescimento competitivo (Agar.io). Joga diretamente no navegador, em Android e PC, sobre o **mapa real de qualquer lugar do mundo** com Leaflet + OpenStreetMap.

## Jogar

Site: https://pulsebreakpt.github.io/NeonInfiniteCity/

No **menu principal**, pesquisa e escolhe uma cidade para nascer, usa o botão **Aleatório** ou toca em **Escolher no mapa** para marcar livremente o teu ponto de partida. Também podes abrir **MUNDO** para introduzir coordenadas ou selecionar um local com o dedo. Move a personagem com o joystick no telemóvel ou WASD/setas no PC. Quando sais do território azul, deixas um trilho. Volta à zona azul para fechar o percurso e conquistar um **polígono contínuo e com os contornos reais do percurso**, sem grelha nem quadrados. Não deixes rivais atravessar o teu trilho. O botão **BOOST** ou espaço acelera-te durante um período limitado. Apanha os pontos de energia dourados.

O jogo inclui 24 cidades de arranque, seleção de qualquer latitude/longitude, localização opcional mediante permissão, mapas OSM, oito bots com territórios próprios, linhas vulneráveis, conquista por polígonos, colisões, classificação local, pontos, boost, recorde e áudio opcional. A viagem inicia uma partida nova; o recorde é guardado em `localStorage`.

**Limitação importante:** nesta versão os outros jogadores são bots simulados localmente, não jogadores online. Multiplayer global síncrono, contas, território persistente partilhado e anticheat requerem servidor e base de dados, não incluídos neste projeto estático do GitHub Pages. Não são anunciados como disponíveis.

## Código

- `src/core.js` — projeção Web Mercator, territórios em polígonos com índice espacial, fecho de percursos e colisões testáveis sem browser.
- `src/arcade.js` — direção progressiva, IA de bots, massa/velocidade, vizinhança de entidades e qualidade adaptativa.
- `src/game.js` — gestão da partida, Leaflet, renderizador Canvas, bots, HUD, controlos e menus.
- `style.css` + `light.css` — visual light mode responsivo, menus e HUD.
- `index.html` — entrada acessível do jogo.
- `tests/` — testes automáticos (`npm test`).

Execução local: `npm run dev`, depois abrir `http://localhost:8080`.
Verificação: `npm run check && npm test`.

## Mapa e licença

Os mosaicos são pedidos **apenas para a zona visualizada**, diretamente a `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, sem downloads antecipados ou offline. É necessária ligação à Internet. Mantemos a atribuição visível `© OpenStreetMap contributors`. A política de tiles da OSM Foundation aplica-se: https://operations.osmfoundation.org/policies/tiles/. Para tráfego elevado ou distribuição comercial, migrar para um fornecedor de mosaicos com capacidade e licença adequadas.

Leaflet 1.9.4 é obtido por CDN. O código do jogo é original, sem recursos ou código proprietários de Paper.io ou Agar.io.

## Versão 3.0 — motor arcade competitivo inspirado no género .io

A arquitetura foi revista com referência à documentação oficial da jogabilidade de Paper.io 2, implementações abertas de Agar.io e recomendações MDN para loops de jogo (links abaixo). A versão implementa **mecânicas semelhantes de forma original**, sem usar recursos, identidade ou código proprietário dos jogos.

- Movimento contínuo com aceleração direcional limitada: joystick/WASD/mouse definem a direção desejada, com curva gradual em vez de virar instantaneamente.
- Crescimento por energia e conquistas, com maior dimensão visível e uma penalização moderada de velocidade, inspirado na dinâmica de massa do género Agar.io.
- Bots com IA de patrulha, perseguição de trilhos vulneráveis, regresso ao seu território e fuga de personagens muito maiores.
- Captura de áreas e eliminação por interseção dos trilhos: os polígonos continuam livres e sem células quadradas.
- Índice espacial para operações geométricas, com milhares de capturas possíveis sem o antigo limite de 140; a grelha é apenas índice de aceleração, não geometria de território.
- Colisões com movimentos entre frames, pesquisa de energia por vizinhança e qualidade gráfica adaptativa perante perdas persistentes de FPS.
- Renderização de terrenos em cache atualizada apenas quando há alterações ou deslocamentos suficientes; câmara do mapa com acompanhamento mais frequente e animação curta.
- A interface mantém o tema claro, o menu mundial de nascimento, os controlos Android/PC e uma nova indicação de massa.

**Fontes técnicas de referência**: [regras oficiais Paper.io 2](https://support.paper.io/support/solutions/articles/202000095752-what-are-the-basic-rules-of-paper-io-2-), [modelo cliente/servidor com previsão no cliente, implementação aberta de Agar.io](https://github.com/i-radwan/agar.io/blob/master/README.md), [MDN: main loop](https://developer.mozilla.org/en-US/docs/Games/Anatomy), [Leaflet: Canvas](https://leafletjs.com/reference.html), [política de mosaicos OSM](https://operations.osmfoundation.org/policies/tiles/).

**Limitações**: o projeto estático é um jogo local com bots. Não contém estado sincronizado com servidor, autenticação, anti-cheat em servidor ou adversários humanos em tempo real. Para multiplayer verdadeiro será preciso um servidor autoritativo com WebSockets, previsão local e reconciliação. O mapa depende de Leaflet/CDN e do fornecedor de mosaicos ativo; evitar pré-carregamento massivo de tiles.

## Versão 2.1 — estabilidade e fluidez

- Movimento em passos fixos de 60 Hz, evitando deslocamentos irregulares quando o FPS varia.
- Cache de territórios com deslocação suave entre atualizações, sem recalcular todos os polígonos em cada frame.
- Limite adaptativo de cálculo de área para impedir bloqueios após capturas.
- Leaflet com atualizações de câmara menos frequentes para reduzir carregamento de mosaicos.
- Colisão contínua entre movimento e trilhos, mesmo com frames atrasados.
- Escala de resolução adaptada para ecrãs de elevada densidade e menos bots demasiado próximos da origem.
- Modo de mapa indisponível mantém a câmara centrada no jogador sobre o fundo simplificado.

Testes: `npm run check` e `npm test`. O mapa OpenStreetMap requer internet; o teste visual local foi efetuado sem acesso aos mosaicos externos.
