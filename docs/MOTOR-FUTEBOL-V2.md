# CLUB DYNASTY — Motor de futebol V2

## Objetivo e regras de integração

Substituir o cálculo estatístico prévio do **jogo do treinador** por uma simulação autónoma da bola e das 22 entidades. A época, os contratos, o plantel, o mercado e a economia são estados separados e **não** se alteram até ao apito final.

### Pipeline por partida

1. `beginLiveMatch(state,{engine:'physics'})` cria uma cópia isolada do clube e instancia `createWorld()` a partir do onze, formação, táticas e adversário.
2. `tickLiveMatch()` avança **12 passos determinísticos** de física `FIXED_DT=.2s` por minuto mostrado. O relógio tem descontos, intervalo, pausas e 90+X minutos.
3. O mundo simula diretamente `22 jogadores + bola`: âncoras táticas, forças, aceleração e inércia, posse, decisão de passe, drible, interceção, remate, guarda-redes e árbitro.
4. A bola é independente, com componentes de velocidade `vx/vy/vz`, gravidade, amortecimento no relvado e colisões/interceções.
5. Quando a bola sai, o árbitro decide reposição; remates só são golos se a bola cruza a linha de baliza dentro dos postes e abaixo da barra.
6. `worldResult(world)` traduz estado e acontecimentos reais para a interface; **não determina um resultado antes de jogar**.
7. `finishLiveMatch()`, apenas no apito final, atribui o resultado destacado ao `applyRound()`, calcula os restantes jogos e aplica uma única transação de classificação, prémios, salários, assistência e calendário.

### Separação lógica/visual

`physics-engine.js` não usa DOM, áudio, canvas, `performance.now`, `requestAnimationFrame` nem dependências do browser. O renderizador `pitch-render.js` desenha a posição e projeta velocidade entre passos fixos, mas não altera a física. A velocidade 1×/2×/4× controla apenas a cadência do relógio na UI.

### Regra das bolas paradas

- Lateral: último toque decide a equipa contrária; marcador sobre a linha e opções de passe próximas.
- Canto: bola transpõe linha de fundo após último toque de um defesa, com marcador junto à bandeirola; atacantes e defesas repositionam-se.
- Pontapé de baliza: a bola atravessa o fundo após toque atacante.
- Livre e penálti: faltas de contacto são assinaladas pelo árbitro; posições preparadas antes de executar; barreira em livres.
- Fora de jogo: verificação da linha do penúltimo defesa no instante da decisão do passe.
- Intervalo e final: estados explícitos; a física não avança durante uma pausa.

### Testes de qualidade

Testes de `physics-engine.test.mjs` executam partidas sem interface e verificam posição dos jogadores, fidelidade dos eventos, colisão com baliza, exclusão de golos fora dos postes, determinismo de saves, recuperação após interrupção, influência das táticas e aplicação única do resultado no final.

**Limitações:** este é um motor original de futebol simplificado. Não resolve VAR, vantagem, mão na bola, todos os tipos de falta, impedimento milimétrico com braços, desgaste fisiológico, árbitro físico individual ou jogadores controlados manualmente. O objetivo primeiro é consistência, previsibilidade, manutenção do jogo e taxas de quadros estáveis.
