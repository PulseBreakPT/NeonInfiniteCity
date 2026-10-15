# CLUB DYNASTY · FOOTBALL MANAGER

Jogo original de gestão de futebol, em português europeu, single-player, publicado gratuitamente no GitHub Pages.

**Jogar:** https://pulsebreakpt.github.io/NeonInfiniteCity/

## Motor de futebol físico v8

A partida principal utiliza um mundo métrico de **105 × 68 m**, com **22 jogadores independentes**, bola tridimensional e passos físicos determinísticos de **0,2 s**. O marcador e as estatísticas nascem de eventos simulados durante o jogo; a jornada só é confirmada ao apito final. A exibição visual interpola os mesmos estados do motor, sem gerar movimentos fictícios da bola.

**Melhorias v3:** identidades únicas de atletas no campo; aceleração, travagem, fadiga e colisões corporais; deslocação sem bola em função de formação, posse, marcação e pressão; passe e remate com erros de execução; rotação, gravidade, atrito, ressalto e colisões com postes e barra; guarda-redes que antecipam, mergulham, agarram ou desviam a bola sem teletransportes; cantos, lançamentos, livres, pontapés de baliza e penáltis executados no local correto; infrações de fora de jogo só quando o destinatário intervém; cartões, expulsões e suspensão na jornada seguinte.

**Novidades v4:** meteorologia progressiva gerada por seed (vento, chuva, aguaceiros, temperatura, relvado húmido e aderência), efeitos no voo/rolamento da bola, fadiga dependente do clima, contacto com risco de lesão e recuperação por semanas. O árbitro trata a lei da vantagem, o segundo toque após reposição, o limite de oito segundos do guarda-redes e os golos diretos não permitidos após lançamentos laterais e livres indiretos. A simulação usa também um esqueleto procedural tridimensional articulado para poses de corrida, remate, mergulho e queda, projetado nas quatro câmaras 2.5D.

**Melhorias de integridade v7 (outubro de 2026):** inversão física de campo ao intervalo, direção de ataque e linha de fora de jogo corretas nas duas partes; banco de até nove jogadores por equipa; até cinco substituições em três janelas, trocas ao intervalo, substituição automática de lesionados e decisões da IA adversária; limite de dez segundos para abandonar o terreno com atraso de entrada; perda por número insuficiente de jogadores; regresso após avaliação médica; contagem para lançamentos e pontapés de baliza demorados; decisões por primeiro cruzamento físico de linhas; lançamentos com trajetória a partir das mãos, cantos na bandeirola, cabeceamentos, bloqueios e infrações por contacto mão-bola; assistências, autogolos e participações de suplentes; alterações táticas durante a partida, descontos calculados a partir das interrupções e atualização dos saves em curso.

**Novidades v8 (13 de outubro de 2026):**
- Arbitragem após a troca de campo: área de penálti, mãos do guarda-redes e livres indiretos orientados corretamente.
- Fim das expulsões falsas: substituições, lesões e ausências médicas já não se transformam em cartões vermelhos no relatório e nas suspensões.
- Treinador com mudança de formação em direto (4-3-3, 4-4-2, 4-2-3-1, 3-5-2, 5-3-2), mantendo intacto o onze inicial oficial para o registo da carreira.
- Taça com dois períodos de 15 minutos de prolongamento, remates individuais em séries de cinco penáltis, eliminação antecipada e morte súbita. O replay da Taça permite navegar até aos 120 minutos.
- Bloqueios físicos calculados através de toda a trajetória da bola entre passos da simulação; cabeceamentos e lançamentos com poses corporais sincronizadas.
- Livres diretos distinguidos de cruzamentos: elimina a lógica anterior em que praticamente todos eram enviados ao centro da baliza; autoria de golos por último toque, contagem para guarda-redes e testes de situações excecionais.
- Módulos adicionais de testes de regras, arbitragem, Taça, biomecânica, reconstrução de saves, colisões contínuas e execução de um jogo até à atualização financeira.

**Regras de referência:** [IFAB — Leis do Jogo 2026/27](https://theifab.com/law-changes/latest/) e [Law 3 — The Players](https://theifab.com/laws/latest/the-players/). Estas são referências externas; o jogo continua a ser uma interpretação estilizada, não um motor oficialmente certificado.

**Validação:** testes adicionais para troca de campo, substituições e janelas, regras de interrupção e reinícios, cabeceamentos, golos e migração de partidas guardadas. O desenvolvimento usa um relógio de futebol acelerado para ser jogável no navegador: 36 passos de física de 0,2 segundos por minuto mostrado no marcador. Isto **não equivale** a 60 segundos físicos completos por minuto. A reprodução integral dos 90 minutos em tempo físico real continua fora do âmbito deste motor compacto.

**Limites técnicos reais:** não existe ainda física biomecânica rígida e articulada integral, protocolo VAR com revisão de vídeo verificável, suporte exaustivo de todas as Leis 1–17, nem um motor único que simule fisicamente todos os jogos das competições secundárias. O objetivo é um jogo original funcional e progressivamente mais realista, não uma certificação profissional.

A cobertura de arbitragem é mais extensa, mas não é um motor certificado por todas as exceções IFAB; a biomecânica é aproximada e não utiliza um motor 3D rígido com deformações, roupa e corpos de colisão complexos. Os jogos principais continuam a ser calculados no motor 2D métrico.

A física mantém os saves antigos e as quatro câmaras da transmissão. Os testes automáticos verificam os reinícios, o contacto, os ressaltos, a reprodutibilidade e a conclusão das partidas. Ainda é um **simulador estilizado 2.5D**, não uma reprodução biomecânica completa, VAR ou a implementação exaustiva de todas as exceções das Leis do Jogo.


## Sistemas da versão 0.3 — inteligência e integridade

1. Motor de partidas: simulação de 90 minutos assente em posses, passes, interceções, remates, defesas, faltas, cartões, lesões e golos (não são pré-definidos); meteorologia, adaptação tática rival ao intervalo e replay animado 2D.
2. Plantel: 26 jogadores iniciais, seis atributos, idade, potencial, nacionalidade, lesões, contratos, classe, progressão, papéis e estatísticas.
3. Táticas: cinco formações, escalonamento do onze, pressão, mentalidade, passe, marcação, ritmo e modificadores que influenciam a simulação.
4. Treinos: cinco sessões, fadiga, limites semanais, recuperação, moral e reforços.
5. Transferências: mercado de jogadores fictícios, leilões simulados, observação com IDs únicos, compra, venda, contratos e prazos mínimos de integração.
6. Competições: liga de 16 equipas e 30 jornadas, 240 partidas, treinadores e plantéis rivais persistentes, evolução económica e tática da IA, calendário, Taça, prémios, troféus e novas épocas.
7. Academia: recrutamento, treino e promoção de jovens.
8. Campus: seis instalações com dez níveis, custos e bonificações.
9. Finanças: receitas e despesas, salários mensais contabilizados por quotas semanais, dívidas e salários em atraso, confiança da direção, ocupação dinâmica do estádio, patrocínios diferenciados, transferências, orçamento e livro de movimentos.
10. Mentores: quatro especialistas fictícios, experiência, nível e bónus táticos.
11. Social: amigáveis contra equipas IA; área separada para funcionalidades online futuras.
12. Eventos: objetivos diários e semanais, prémios e conquistas.
13. Colecionáveis: equipamentos alternativos, cartas aleatórias, troca de repetidas, loja de recursos com tokens **ganhos no jogo, sem compras reais**.
14. Carreira do treinador: nível, experiência, vitórias, empates, derrotas, palmarés e várias épocas.
15. Recompensas: bónus por jornada (sem repetição ao avançar dias), limites de descanso e amigáveis, tratamento, moral e objetivos sem perda após a partida.
16. Clube: edição de identidade, save automático, exportação e importação JSON.

### Estado e limites

**Funciona totalmente offline após a primeira visita**, sujeito à compatibilidade e armazenamento do navegador. O progresso reside no dispositivo, não na nuvem. Saves antigos v1 são importados para o novo modelo mantendo clube, atletas, orçamento, dia e treinos.

**Ainda não são funcionalidades reais**: contas e amigos online, confederações globais, sincronização entre aparelhos, torneios com pessoas, 3D verdadeiro, clubes/licenças oficiais ou pagamentos. Esses sistemas exigem backend, autenticação, infraestrutura de rede e/ou conteúdo adicional. O jogo principal dispõe de simulação espacial 2D com física da bola, mas não tem corpos 3D articulados ou biomecânica completa; os modos legados continuam baseados em eventos. As táticas devem ser escolhidas antes da partida, pois o replay não permite alterar um resultado já gerado.

Os rivais, mentores, atletas e logótipos são fictícios e originais. O CLUB DYNASTY não é afiliado à Nordeus ou ao Top Eleven.

## Arquitetura

Aplicação modular em JavaScript ES Modules, HTML5 e CSS, com testes nativos de Node.js e deploy no GitHub Actions.

| Ficheiro | Objetivo |
|---|---|
| model.js | Estado, ligas, calendário, jogadores, persistência e migração v1 |
| sim.js | Resultados, golos, táticas, jogo, Taça, fim de época e finanças de partidas |
| actions.js | Regras e validações de todas as ações do jogador |
| ui-core.js | Componentes e navegação |
| ui-main.js | Gabinete, partida/replay, táticas e plantel |
| ui-extra.js | 12 ecrãs de gestão complementares |
| main.js | Navegação, eventos, saves, formulário, replay e ecrãs |
| styles-v2.css | Identidade visual responsiva |
| tests/core.test.mjs | Testes automáticos de regras e integridade |
| .github/workflows/pages.yml | Validação e publicação |

## Testar localmente

Requer Node.js 22 para os testes (o jogo web não tem dependências).

```sh
npm run check
npm test
python3 -m http.server 8080
```

Abre http://localhost:8080 (não uses file:// porque os ES Modules exigem origem HTTP). O workflow executa testes antes da publicação.

## Sistema de saves

v2 usa `localStorage:club-dynasty-v2`; ao abrir, procura primeiro o novo formato e depois o `club-dynasty-v1`. Exporta regularmente backups JSON. Uma limpeza de dados do browser remove o save local.

## Desenvolvimento futuro

O passo seguinte para verdadeira equivalência com um jogo de serviço online será backend, autorização, economia server-side, multiplayer e simulação simultânea. Também são possíveis física contínua e grafismo 3D com um motor adicional.

© 2026 CLUB DYNASTY.

## Auditoria do motor 0.3

- A simulação é gerada por sequências de decisões, com eventos e estatísticas derivadas de ações de jogo.
- Rivais controlam 18 atletas, técnico, estilo de jogo, dinheiro, moral e plantel, evoluindo ao longo das jornadas.
- Lesionados e jogadores com contrato expirado são automaticamente retirados do onze antes do apito inicial.
- As operações são atómicas; em caso de erro não alteram parcialmente o estado.
- O scouting mantém identificadores únicos e os jogadores promovidos não podem ser vendidos imediatamente.
- Despesas que excedem o saldo tornam-se dívidas, afetam a moral e a confiança da direção.
- Patrocínios diferentes proporcionam pagamentos diferentes por jornada.
- Amigáveis não aumentam estatísticas oficiais nem atribuem prémios.
- A primeira época permite importar saves de versões anteriores.

**Limitações atuais:** o replay 2D representa acontecimentos discretos, não uma física contínua de 22 agentes. As instruções do jogador devem ser definidas antes do início da partida; a IA adversária consegue reajustar a estratégia ao intervalo. Contas reais, multijogador síncrono, confederações e antifraude no servidor continuam dependentes de uma plataforma de backend. A interface não substitui testes manuais em todos os aparelhos Android.

### Táticas reativas e disciplina

O treinador pode definir um plano para o intervalo (automático, agressivo, proteger ou manter). A IA rival também ajusta a mentalidade em função do marcador e da capacidade do técnico. Cinco cartões amarelos ou uma expulsão podem provocar suspensão para a jornada seguinte; o onze é recalculado para impedir que atletas suspensos joguem.

## Design 0.4 — Football Universe

O CLUB DYNASTY utiliza agora uma interface de jogo em ecrã completo (Game UI), deixando para trás a apresentação de dashboard web:

- **HUD permanente** com identidade do clube, época, competição, saldo, tokens e progresso local.
- **Barra lateral compacta** com cinco modos principais; os restantes ecrãs são abertos pela faixa de atalhos ou Centro de Operações.
- **Ecrã MATCHDAY** de apresentação do confronto, com um estádio SVG original, identidade dos clubes e botão de jogar.
- **Player Deck** — plantel apresentado em cartões individuais com classificação, posição, silhueta, atributos, condição e interação para abrir detalhes.
- **Relvado tático, replay e estatísticas** com tratamento visual de transmissão desportiva.
- **Cartões dos sistemas de gestão** reformulados como interfaces de videojogo em toda a aplicação.
- **Navegação Android** por cinco atalhos inferiores, menus disponíveis no ecrã “Mais” e área de conteúdo independente sem scroll da página.
- **Animações reduzidas automaticamente** quando o utilizador ativa a preferência de movimento reduzido.
- **Design original**, sem copiar o grafismo ou assets de um jogo comercial.

A folha `styles-v3.css` estende a camada anterior de estilos sem alterar qualquer save nem as regras do motor. O novo cenário é `assets/stadium.svg`, original e gerado exclusivamente em SVG.

## V0.5 — Modo jogo SSS Tier

O gabinete foi reconstruído como complexo desportivo isométrico original, com cinco zonas clicáveis que abrem os modos de jogo. O ecrã principal contém consola do treinador, estatísticas e comandos sem depender de uma página extensa de painéis.

- Cenário original em SVG isométrico: `assets/stadium-isometric.svg`.
- 12 salas de gestão possuem ambientação própria, sinal operacional, métrica contextual e atalhos.
- Ecrã de partidas com HUD de transmissão desportiva, cronologia do jogo, marcadores de golos/cartões, pausa, velocidade e avanço manual do replay.
- Layout adaptável a dispositivos móveis, com scroll apenas no conteúdo interno quando necessário.
- Teclas de acesso rápido 1-5 e Escape em dispositivos com teclado.
- Acessibilidade: botões com títulos e legendas, redução automática de animações segundo a preferência do sistema.
- As regras de partida, economia, calendário e os saves antigos continuam preservados.

A interface carrega `styles-v4.css` sobre os temas anteriores. O Service Worker tem uma nova versão para atualizar os recursos offline sem apagar os saves.

## v0.6 — Design e escrita com Impeccable

- Retiradas frases publicitárias genéricas e rótulos decorativos; as descrições que permanecem comunicam custos, limites e consequências.
- Cabeçalhos dos modos simplificados, menos painéis repetitivos e destaque para estádio, preparação da jornada e decisões do treinador.
- Ícones consistentes no treino, salas de gestão mais compactas, ecrã de amigáveis concentrado nas equipas IA realmente jogáveis.
- Melhor contraste, estados de foco e áreas de toque. Preservados os dados locais e os sistemas do motor.
- Produto e regras visuais descritos em PRODUCT.md e DESIGN.md; o projeto inclui o skill Impeccable (Apache-2.0) sob .agents/skills/impeccable.
- Workflow instala o CLI oficial Impeccable 4.5.2 em modo de projeto, gera um relatório determinístico e executa os testes em Chromium.

### Desenvolvimento / auditoria

Executar num ambiente com Node 22.18+ e acesso ao npm:

    npm run design:install
    npm run design:audit
    npm run check
    npm test

O comando design:audit é uma auditoria, não substitui inspeção visual. O ficheiro impeccable-audit.json pode ser descarregado nos artefactos do workflow; findings de estilo devem ser interpretados no contexto do jogo. Os resultados da auditoria não interferem com a experiência no navegador.

## v0.6.2 — Correção dos textos cortados

Auditoria em Chromium de todos os 17 ecrãs a 320, 360, 390, 768, 1024 e 1440 px. Os painéis de jogo foram adaptados para aceitar quebra de linha de nomes, quantias e ações; o gabinete apresenta duas colunas em telemóveis pequenos. Atalhos horizontais em larguras intermédias passam a estar no menu «Mais». O quadro tático adapta os nomes junto às linhas laterais. O script `tests/clipping-audit.mjs` ignora conteúdo deslocado para fora da área visível mas acessível por scroll e sinaliza apenas truncagem real. Preservados os dados do jogo e o motor de simulação.

## v0.6.3 — Android / painel da jornada

Corrigida a sobreposição capturada em Android: botão de partida duplicado removido do título; o painel do próximo jogo passa para uma zona própria abaixo do mapa do estádio, com botão a toda a largura. Todos os cinco pontos de navegação do estádio ficam separados e disponíveis. Regressão Chromium mede os limites reais do botão, centro clicável dos pontos de navegação e a ausência de sobreposição a 320, 360, 377, 390 e 414 px. Estilos adicionais em `styles-v7.css` e versão nova da cache PWA para atualização sem apagar o progresso.

## v0.7 — Modo Carreira

O ecrã central passou a ser um complexo desportivo navegável, com cinco pontos de acesso ao mundo do clube, painel de jornada completamente separado do estádio e barra inferior de seis comandos de modo. O relatório do treinador ocupa a lateral do estádio apenas em ecrãs largos; os ecrãs móveis dão prioridade ao jogo e às decisões. O HUD, o relvado tático, o campo do replay, os cartões de jogadores e as 12 divisões de gestão usam um sistema visual coerente com a modalidade, sem transformar o jogo numa landing page. `styles-v8.css` substitui a apresentação anterior; a estrutura de dados, os saves e o motor são compatíveis.

## v0.8 — Editor do onze titular

O relvado tático e a lista do plantel passaram a ser controlos interativos. Toca numa posição no relvado e escolhe um atleta para substituí-lo; seleciona «Retirar do onze» para deixar uma vaga; escolhe um futebolista antes de selecionar a posição para fazer a operação no sentido contrário. O editor permite trocar dois titulares, coloca titulares lesionados ou suspensos como indisponíveis e indica quando existem menos de onze atletas atribuídos. O simulador completa automaticamente posições vazias antes de disputar uma partida, como já fazia para atletas indisponíveis. O jogador permanece no clube quando sai do onze. Também é possível abrir a ficha de um jogador no plantel e tocar em «Escolher para o onze». Todas as alterações guardam-se localmente. A regressão é verificada com testes unitários e Chromium em Android 390×844 e desktop 1440×900.

## v0.9 — Economia e contratos recuperados

Corrigido um bloqueio persistente do jogo: salários iniciais superiores à receita previsível, taxas de transferência excessivas, ausência de futebolistas livres e expiração dos contratos sem renovação automática. Os direitos televisivos (85 000 €/jornada) e os patrocínios têm agora receitas separadas; a manutenção e os salários são apresentados numa previsão financeira. O mercado oferece duas contratações gratuitas por jornada e pelo menos uma contratação abaixo de 100 000 €, com preços baseados no valor desportivo. Os jogadores livres não pagam transferência mas recebem salário e só podem ser vendidos após oito jornadas.

Ao carregar um save v2 antigo, o jogo executa uma regularização **uma única vez** (marcada por `finance.economyRevision=4`): contratos expirados são prolongados por duas ou três épocas, as dívidas anteriores são regularizadas e, se o clube estiver em dificuldades, o saldo é aumentado até 450 000 €. Isto **não** apaga os jogadores, a divisão, a classificação, os resultados ou as instalações. A ajuda não é repetida após gravar e recarregar o jogo. Nos futuros fins de época, os contratos que cheguem a zero têm uma extensão automática de uma época com ajuste salarial de 2,5%; o treinador pode prolongá-los manualmente por três épocas sem taxa de assinatura (uma vez por época). A venda de jogadores foi corrigida para não permitir enormes ganhos através de agentes livres. Testes cobrem oito épocas, meia época com treino semanal e a migração de saves em Chromium Android.

## v1.0 — Jogo acompanhado em direto, 90 minutos e descontos

O botão «Jogar jornada» passa a iniciar uma partida acompanhada minuto a minuto: dois tempos de 45 minutos com tempos de compensação gerados para cada encontro (1–4 minutos na primeira parte, 2–6 na segunda), intervalo real, relógio, marcador atualizado apenas quando os golos acontecem, relato cronológico, relvado tático 2D com movimentos, pausa e velocidades 1×/2×/4×. O motor calcula os eventos de forma determinística num estado isolado do clube e apenas confirma os resultados, classificação, bilheteira, salários, adeptos, lesões e restante calendário **depois** do final dos descontos. Não há cobrança ou alteração da liga ao pontapé de saída. A partida fica guardada no dispositivo e é retomada no minuto alcançado depois de fechar/reabrir. Não se trata ainda de física contínua de futebol nem de controlo humano dos jogadores; é uma transmissão 2D de acontecimentos do motor.

Implementação em `match-live.js`, `main.js`, `ui-main.js` e `styles-v11.css`. Cobertura em testes unitários, regressões do jogo e teste de Android em Chromium que verifica intervalo, tempo de compensação, pausa, recarregar em curso e aplicação única do resultado final. O save existente continua compatível.

## v1.1 — Motor de movimentação tática 2D

Campo tático com 22 futebolistas distribuídos pelas cinco formações existentes, linhas móveis de pressão, mentalidade defensiva/ofensiva, circulação da bola baseada nos passes registados e animação Canvas independente da atualização da UI. O motor de acontecimentos foi alargado para registar todos os passes concluídos e lançar acontecimentos de cantos, livres diretos, lançamentos laterais e grandes penalidades. Os lances têm coordenadas de campo estáveis e atletas identificados. Cantos posicionam marcador junto à bandeirola, atacantes na área e defesas frente ao guarda-redes; livres criam uma barreira de três jogadores; penáltis colocam o marcador na marca e os restantes fora da área; lançamentos colocam marcador sobre a lateral com opções próximas. Pressão e mentalidade influenciam a deslocação de cada linha.

Renderizador dedicado `pitch-render.js` usa Canvas 2D (até 30 FPS, DPR limitado a 2) em vez de 22 mutações de DOM por frame. `pitch-spatial.js` é um gerador determinístico de posições e movimentos, ligado aos acontecimentos do motor. Os cálculos da liga, receitas e resultados continuam isolados até ao apito final. A representação é tática e aproximada: não é ainda um sistema completo de colisões físicas, regras de fora de jogo ou dinâmica individual contínua.

## Motor V2 (em testes)
Novo motor de partidas baseado em física e IA, desenvolvido no ramo `feat/simulation-engine-v2`. Ver [`docs/MOTOR-FUTEBOL-V2.md`](docs/MOTOR-FUTEBOL-V2.md). Esta secção só é publicada na versão principal quando os testes isolados e as partidas Android estiverem aprovados.

## v2.0 — Motor de futebol 11 contra 11 (beta de jogo)

O jogo do treinador usa agora o motor original `physics-engine.js`: campo 105×68 m, jogadores com inércia/atributos, bola física independente, IA coletiva e individual, pressão, marcação à zona e individual, passes, desarmes, remates, defesas, fora de jogo, cantos, livres, lançamentos e penáltis. 36 passos fixos de simulação por minuto visual, renderização Canvas independente e save/retoma entre minutos. O marcador é produzido pela bola e pelo árbitro — já não é sorteado antes da partida — e só se oficializa depois do apito final, com as outras jornadas da liga calculadas em `sim.js`. O motor estatístico antigo continua apenas para as outras equipas da liga, taça, amigáveis e partidas já iniciadas na versão anterior. [Arquitetura](docs/MOTOR-FUTEBOL-V2.md).

Foram executadas 1.024 partidas completas no ramo de isolamento, com testes automáticos do árbitro, estatísticas, determinismo de saves, tempo de compensação, operações financeiras e verificações Chromium Android. A simulação ainda é uma interpretação simplificada do futebol 2D: não é equivalente a um motor comercial com todas as nuances de contacto, arbitragem e controlo humano.

## v2.1 — Animação contínua e ritmo 1×

A antiga cadência de 36 passos físicos executados em apenas 320 ms por minuto foi substituída por 36 atualizações individuais. Na reprodução normal, cada passo físico de 0,2 s ocupa 0,2 s reais; velocidades 2× e 4× aceleram explicitamente a reprodução. Uma partida completa dura agora aproximadamente 11–12 minutos em 1×, com intervalo e compensações. O Canvas interpola apenas o passo físico imediatamente anterior e o seguinte, em vez de percorrer instantaneamente um minuto inteiro de movimento. O relógio de jogo avança após 36 passos reais e os golos aparecem quando ocorrem; a classificação e o dinheiro continuam a ser aplicados exclusivamente após o apito final. A sessão guarda a posição dentro de cada minuto (`substep`) para reabrir sem saltar jogadas. O renderizador não reconstrói o relato a cada atualização. A bateria Android usa um acelerador de simulação injetado apenas no ambiente de testes.

## v3.0 — Transmissão Match Broadcast

Nova camada gráfica independente do motor físico: relvado 2.5D com marcações, redes, bancadas, LED publicitário e iluminação; futebolistas procedurais articulados com cabeça, camisola, braços, pernas e animação de corrida, números e sombras; bola com altura aparente, posição real e portador destacado. Quatro câmaras reais de Canvas: TV, Equilibrada, Lateral e Tática, alternadas no ecrã do jogo e gravadas por partida. A câmara acompanha a bola de modo suave sem alterar a física ou revelar acontecimentos futuros. Correção adicional de orientação corporal limitada por velocidade de rotação, condução mais estável sem saltos aleatórios e guarda-redes posicionado segundo a proximidade à própria baliza.

A inspiração técnica veio da apresentação de destaque, controlo de câmaras e animações contextuais de Top Eleven e dos sistemas de mistura de animações e de posicionamento do Football Manager e Soccer Manager; **esta implementação é original, em Canvas 2D, não usa código nem assets proprietários e não é um motor 3D comercial**. A atualização preserva o save v2.1, a economia e as competições. O frontend guarda o ângulo de câmara no save `liveMatch.camera` e não altera os resultados.


## Universo de gestão v1.0 (14 outubro 2026)

Além da simulação de partidas, o modo carreira tem agora sistemas de gestão
persistentes e determinísticos, sem serviços externos e compatíveis com os saves
anteriores: mercado com clubes compradores financiados, negociação individual de
salários e duração dos contratos, empréstimos de uma época com retorno ao clube
de origem, promessas de utilização e consequências no balneário, patrocínios com
prazo mínimo, crédito bancário e encargos financeiros, entradas anuais de
jovens e progressão dos clubes rivais.

A interface do plantel oferece novas decisões individuais; finanças apresenta
indicadores de dívida, exposição e previsão das próximas quatro jornadas; eventos
agrega notícias, evolução das divisões secundárias e histórico económico, e o
perfil do treinador apresenta os registos das épocas encerradas. As operações
continuam transacionais em \`execute\`; o novo módulo \`management-universe.js\`
centraliza as regras complementares.

O universo offline simplifica necessariamente aspetos do futebol profissional:
os campeonatos inativos usam uma classificação abstrata, e não um calendário
integral de todos os clubes; negociação salarial usa limiares determinísticos,
não conversas livres; empréstimos são por uma época sem opção de compra;
o crédito tem juros mas não substitui um sistema de contas bancárias real.
Todos os clubes, jogadores e patrocinadores são fictícios.


## Navegação ilustrada — Game Art v14

O projeto utiliza **17 imagens SVG transparentes**, sem fundos, emblemas ou
escudos, para as 16 áreas de gestão e o menu **Mais**. A linguagem visual segue
as cores naturais de cada objeto: relva verde no estádio, bola branca/preta,
quadro tático verde, taça dourada, dinheiro verde e dourado, halteres metálicos,
materiais de treino, etc. Os ficheiros estão em \`assets/ui-icons/\`.

Todos os ícones surgem na barra lateral, navegação móvel, atalhos do centro de
operações e títulos das áreas, com tamanhos adaptados e acessibilidade mantida
através do nome dos botões. Os elementos são vetoriais, escaláveis e possuem
transparência nativa; não dependem de fontes de ícones externas. O service
worker pré-carrega as imagens para que funcionem offline.

*Para editar um ícone*, altera apenas o SVG correspondente em
\`assets/ui-icons/<id>.svg\`; os caminhos são definidos no renderizador em
\`ui-core.js\`. As regras de apresentação estão em \`styles-v14.css\`.


## Proteções contra exploits de gestão (2026)

A lógica de oposição usa uma seed persistente do universo, não a força
momentânea dos 13 ou 14 jogadores mais fortes, derrotas propositadas ou
alterações ao nome do clube. O treino tem limites semanais por jogador; os
relatórios de observação têm limite por jornada; as recompensas têm um livro
de resgates persistente; os packs usam um nonce para impedir previsibilidade
de resultados por repetição no mesmo dia. As renovações, incluindo os fluxos
compatíveis com saves antigos, usam salários relacionados com o mercado.
As vendas de reforços adquiridos na própria época têm proteção contra
arbitragem imediata, além do período de integração.

**Limite de segurança:** o jogo é single-player e funciona offline; por isso,
quem editar o \`localStorage\`, a consola do navegador ou o ficheiro JSON do
save pode alterar diretamente valores da carreira. Prevenir essa adulteração
de forma fiável requer armazenamento e validação num servidor de confiança.
As salvaguardas implementadas corrigem abusos das mecânicas normais do jogo,
não prometem proteção anticheat contra um utilizador com controlo do cliente.
