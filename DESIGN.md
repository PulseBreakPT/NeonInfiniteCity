# CLUB DYNASTY — Design direction

## Bancada e sala de treinador
Um videojogo desportivo, não uma página web sobre futebol. O estádio é um mapa de navegação com zonas clicáveis. Os modos de gestão são ecrãs especializados que priorizam atletas, resultados, relvados e decisões.

## Hierarquia
1. Próxima jornada e jogar.
2. Onze inicial, condição física e táticas.
3. Acesso às operações do clube.
4. Informação contextual e histórico.

Um ecrã tem uma ação principal. Cabeçalhos dizem o nome da secção sem kicker/eyebrow redundante. Não repetir dados.

## Tipografia
- Barlow Condensed para ecrãs, clubes e placares; DM Sans para botões, tabelas e explicações.
- Numerais tabulares em estatísticas. Testar texto PT-PT a 360 px, 390 px, tablet e desktop.

## Paleta e superfície
- Azul-carvão esverdeado, verde-relvado contido, lima pálida apenas em ações primárias.
- Vermelho para perigo, dourado para moeda e prémios. Sem brilhos decorativos.
- Uma linguagem de controlos e estados consistente em todos os modos.

## Interação
- Botões reais de navegação e ações, sem superfícies falsas.
- Foco visível, inputs com etiquetas, estados disabled claros.
- Movimento apenas para comunicar estados; respeitar prefers-reduced-motion.
- Desktop: atalhos 1-5 e Escape. Mobile: cinco destinos principais e operações adicionais em Mais.

## Voz editorial
Escrever como um jogo de futebol. Usar «Jogar jornada», «Treinar», «Renovar contrato», «Sem partidas registadas», «Saldo insuficiente» em vez de frases sobre «o futuro» e «o legado». Custos, limites, jornadas e consequências são informação real. Funcionalidades ausentes não ocupam ecrãs simulados.

## Impeccable
Playbooks oficiais clarify, distill, audit, polish e craft-floor de https://github.com/pbakaus/impeccable (Apache-2.0). O CLI faz auditoria determinística e o Chromium verifica percursos reais.
