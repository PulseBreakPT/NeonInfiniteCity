# CLUB DYNASTY · FOOTBALL MANAGER

Jogo original de gestão de futebol, em português europeu, single-player, publicado gratuitamente no GitHub Pages.

**Jogar:** https://pulsebreakpt.github.io/NeonInfiniteCity/

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

**Ainda não são funcionalidades reais**: contas e amigos online, confederações globais, sincronização entre aparelhos, torneios com pessoas, 3D verdadeiro, clubes/licenças oficiais ou pagamentos. Esses sistemas exigem backend, autenticação, infraestrutura de rede e/ou conteúdo adicional. O replay 2D apresenta os acontecimentos simulados; não é uma simulação espacial 3D/física contínua. As táticas devem ser escolhidas antes da partida, pois o replay não permite alterar um resultado já gerado.

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
