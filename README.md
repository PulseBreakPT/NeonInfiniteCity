# CLUB DYNASTY · FOOTBALL MANAGER

Jogo original de gestão de futebol, em português europeu, single-player, publicado gratuitamente no GitHub Pages.

**Jogar:** https://pulsebreakpt.github.io/NeonInfiniteCity/

## Sistemas da versão 0.2

1. Motor de partidas: simulação de 90 minutos, golos, ocasiões, lesões, cartões, fadiga e relatórios de jogo; replay animado 2D.
2. Plantel: 26 jogadores iniciais, seis atributos, idade, potencial, nacionalidade, lesões, contratos, classe, progressão, papéis e estatísticas.
3. Táticas: cinco formações, escalonamento do onze, pressão, mentalidade, passe, marcação, ritmo e modificadores que influenciam a simulação.
4. Treinos: cinco sessões, fadiga, limites semanais, recuperação, moral e reforços.
5. Transferências: mercado de jogadores fictícios, leilões simulados, observação, compra, venda e renovações.
6. Competições: liga de 16 equipas e 30 jornadas, tabela, calendário, Taça, prémios, troféus e novas épocas.
7. Academia: recrutamento, treino e promoção de jovens.
8. Campus: seis instalações com dez níveis, custos e bonificações.
9. Finanças: receitas e despesas, salários, bilheteira, patrocinadores, transferências, orçamento e livro de movimentos.
10. Mentores: quatro especialistas fictícios, experiência, nível e bónus táticos.
11. Social: amigáveis contra equipas IA; área separada para funcionalidades online futuras.
12. Eventos: objetivos diários e semanais, prémios e conquistas.
13. Colecionáveis: equipamentos alternativos, cartas aleatórias, troca de repetidas, loja de recursos com tokens **ganhos no jogo, sem compras reais**.
14. Carreira do treinador: nível, experiência, vitórias, empates, derrotas, palmarés e várias épocas.
15. Recompensas: bónus de atividade, descanso, tratamento, moral e objetivos.
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
