# CLUB DYNASTY ⚽

Jogo original de gestão de futebol para Android e desktop. Este repositório foi reutilizado com autorização do proprietário, substituindo integralmente o projeto anterior.

**Jogar:** https://pulsebreakpt.github.io/NeonInfiniteCity/

## Fase 1 — protótipo jogável

- Fundação do clube: nome, cidade, emblema gerado, cor principal e estádio
- Plantel persistente com 26 futebolistas fictícios, atributos, idade, moral, condição e potencial
- Avaliação individual e classificação do onze inicial
- Formações 4-3-3, 4-4-2, 4-2-3-1 e 3-5-2
- Campo tático interativo: toca numa posição e escolhe um atleta do banco
- Escalação automática do melhor onze por posição
- Treinos técnicos, físicos e de recuperação com custos, fadiga e limite diário
- Avanço diário, recuperação física e histórico de acontecimentos
- Alteração de nome, cidade, estádio e cor do clube
- Guardar automático em localStorage, sem conta nem servidor
- Interface responsiva em português europeu e instalação PWA

**Ainda não inclui** simulação de partidas, campeonato, transferências reais ou multijogador. Estes módulos são das fases seguintes. Não são utilizados clubes ou jogadores licenciados.

## Tecnologia

HTML, CSS e JavaScript puro, sem dependências e sem build. A opção por uma arquitetura estática facilita experimentar a fase inicial diretamente no GitHub Pages. Evolução prevista para TypeScript/Phaser na fase do simulador.

- index.html — entrada e metadados
- styles.css — interface responsiva
- app.js — estado, geração, táticas, evolução e interface
- manifest.webmanifest — instalação PWA
- assets/mark.svg — símbolo original
- .github/workflows/pages.yml — publicação automática

## Etapas seguintes

- Fase 2: táticas avançadas e desenvolvimento dos jogadores
- Fase 3: simulação 2D, partidas completas, estatísticas e IA adversária
- Fase 4: calendário, ligas, competições e mercado de transferências
- Fase 5: estádio, patrocinadores, scouting e economia
- Fase 6: multijogador online, contas e backend

## Experimentar

Abre o link, introduz nome e cidade e pressiona Fundar clube. Vai a Táticas para escolher formações e atletas. Em Treinos, desenvolve o plantel e avança dias para recuperar. O progresso guarda-se apenas neste navegador e é apagado se limpares os dados do site.

## Publicação

O workflow GitHub Pages é executado a cada atualização da branch main. Nas definições do repositório, a origem do GitHub Pages deve ser GitHub Actions.

© 2026 CLUB DYNASTY — projeto independente, sem associação ao Top Eleven.
