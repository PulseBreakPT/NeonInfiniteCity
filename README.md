# ATLAS.IO — conquista o mundo real

Jogo original de conquista territorial inspirado no género arcade de captura de áreas (Paper.io) e crescimento competitivo (Agar.io). Joga diretamente no navegador, em Android e PC, sobre o **mapa real de qualquer lugar do mundo** com Leaflet + OpenStreetMap.

## Jogar

Site: https://pulsebreakpt.github.io/NeonInfiniteCity/

No **menu principal**, pesquisa e escolhe uma cidade para nascer, usa o botão **Aleatório** ou toca em **Escolher no mapa** para marcar livremente o teu ponto de partida. Também podes abrir **MUNDO** para introduzir coordenadas ou selecionar um local com o dedo. Move a personagem com o joystick no telemóvel ou WASD/setas no PC. Quando sais do território azul, deixas um trilho. Volta à zona azul para fechar o percurso e conquistar um **polígono contínuo e com os contornos reais do percurso**, sem grelha nem quadrados. Não deixes rivais atravessar o teu trilho. O botão **BOOST** ou espaço acelera-te durante um período limitado. Apanha os pontos de energia dourados.

O jogo inclui 24 cidades de arranque, seleção de qualquer latitude/longitude, localização opcional mediante permissão, mapas OSM, oito bots com territórios próprios, linhas vulneráveis, conquista por polígonos, colisões, classificação local, pontos, boost, recorde e áudio opcional. A viagem inicia uma partida nova; o recorde é guardado em `localStorage`.

**Limitação importante:** nesta versão os outros jogadores são bots simulados localmente, não jogadores online. Multiplayer global síncrono, contas, território persistente partilhado e anticheat requerem servidor e base de dados, não incluídos neste projeto estático do GitHub Pages. Não são anunciados como disponíveis.

## Código

- `src/core.js` — projeção Web Mercator, polígonos contínuos de território, geometria, fecho de percursos e colisões com testes sem browser.
- `src/game.js` — gestão da partida, Leaflet, renderizador Canvas, bots, HUD, controlos e menus.
- `style.css` + `light.css` — visual light mode responsivo, menus e HUD.
- `index.html` — entrada acessível do jogo.
- `tests/` — testes automáticos (`npm test`).

Execução local: `npm run dev`, depois abrir `http://localhost:8080`.
Verificação: `npm run check && npm test`.

## Mapa e licença

Os mosaicos são pedidos **apenas para a zona visualizada**, diretamente a `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, sem downloads antecipados ou offline. É necessária ligação à Internet. Mantemos a atribuição visível `© OpenStreetMap contributors`. A política de tiles da OSM Foundation aplica-se: https://operations.osmfoundation.org/policies/tiles/. Para tráfego elevado ou distribuição comercial, migrar para um fornecedor de mosaicos com capacidade e licença adequadas.

Leaflet 1.9.4 é obtido por CDN. O código do jogo é original, sem recursos ou código proprietários de Paper.io ou Agar.io.

## Versão 2.1 — estabilidade e fluidez

- Movimento em passos fixos de 60 Hz, evitando deslocamentos irregulares quando o FPS varia.
- Cache de territórios com deslocação suave entre atualizações, sem recalcular todos os polígonos em cada frame.
- Limite adaptativo de cálculo de área para impedir bloqueios após capturas.
- Leaflet com atualizações de câmara menos frequentes para reduzir carregamento de mosaicos.
- Colisão contínua entre movimento e trilhos, mesmo com frames atrasados.
- Escala de resolução adaptada para ecrãs de elevada densidade e menos bots demasiado próximos da origem.
- Modo de mapa indisponível mantém a câmara centrada no jogador sobre o fundo simplificado.

Testes: `npm run check` e `npm test`. O mapa OpenStreetMap requer internet; o teste visual local foi efetuado sem acesso aos mosaicos externos.
