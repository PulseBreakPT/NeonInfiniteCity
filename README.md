# VIDA NOVA 2.0 — Simulador de Vida

Jogo original em português para browsers e Android, inspirado na ideia de escolhas anuais de jogos de simulação de vida.

## Joga

https://pulsebreakpt.github.io/NeonInfiniteCity/

## Conteúdos

- Criação de personagem, infância, educação, trabalho, salário, património, família, relações, acontecimentos e escolhas.
- **100 ações de simulação adicionais** distribuídas por 10 áreas: tempo e rotinas, aprendizagem, relações sociais, trabalho, comércio, habitação, medicina, justiça, tecnologia e mundo.
- Cada ação tem requisitos, custo, risco de resultado desfavorável, uma utilização anual e impacto em atributos ou nos indicadores da simulação.
- **4 pontos anuais de tempo** para as ações adicionais. Não é possível obter mais pontos repetindo a mesma ação no mesmo ano.
- Simulação anual de inflação, procura, abastecimentos, tecnologia, serviços, riscos, custos de habitação e automóvel e benefícios com duração limitada.
- Histórico dos acontecimentos, estado guardado em `localStorage` e migração das vidas iniciadas na v1.
- Página `Sistemas` com pesquisa, categorias e 10 indicadores.

## Notas sobre profundidade

A versão 2.0 implementa as **100 mecânicas como ações jogáveis com efeitos persistentes e risco, integradas no motor anual**. Sistemas como consultas, litígios, cadeias logísticas e redes sociais estão representados por abstrações de gestão, e não por simulações completas de cada indústria, profissão ou entidade real. É uma base extensível, não uma simulação exaustiva do mundo.

## Estrutura

- `src/engine.js`: progressão de vida, carreiras e eventos existentes.
- `src/systems.js`: 100 mecânicas, validação, risco, efeitos e evolução anual dos 10 domínios.
- `src/app.js`: interface e ações.
- `style-*.css`: interface responsiva.
- `tests/`: validações de consistência e sistemas.

## Testes locais

Com Node.js 20+:

```sh
npm run check
npm test
```

A publicação automática está configurada em `.github/workflows/pages.yml`.


## Nova interface SSS Tier · edição 3.0

Visual integralmente reformulado para videojogo: panorama urbano vetorial original, criador de personagem cinematográfico, HUD de capítulo, retrato, indicadores premium, linha do destino, decisões em cartas de narrativa, inventário de ações e dock de navegação permanente. Adaptado a Android e desktop e respeita `prefers-reduced-motion`.

Os ficheiros visuais ativos são `game.css` e `assets/cityscape.svg`. A lógica de simulação e os progressos guardados mantêm-se.
