# Último Abrigo

Jogo isométrico original de exploração e sobrevivência, num bairro fictício português chamado **Vale Sereno**. Substitui integralmente o antigo ATLAS.IO no repositório NeonInfiniteCity. A versão anterior continua no histórico do Git.

**Jogar:** https://pulsebreakpt.github.io/NeonInfiniteCity/

Escolhe Tomás ou Inês. Explora o abrigo, a clínica, a mercearia e a oficina; recolhe água, conservas e medicamentos; encontra combustível e peças; repara o gerador da oficina e regressa ao abrigo para concluir o primeiro dia. Os errantes patrulham as ruas, perseguem quem se aproxima e ouvem a corrida de mais longe. O interior do abrigo é seguro.

## Controlos

| Ação | PC | Telemóvel |
| --- | --- | --- |
| Mover | WASD ou setas | Joystick esquerdo |
| Correr | Manter Shift | Manter CORRER |
| Recolher / reparar / concluir | E | AGIR |
| Comer / beber / curar | 1 / 2 / 3 | Tocar no inventário |
| Lanterna | F | Botão da lanterna |
| Mapa | M | Tocar no minimapa |
| Pausa | Esc | Botão Ⅱ |

O progresso é guardado automaticamente a cada 15 segundos, após recolhas e ao pausar. Usa o mesmo navegador e dispositivo para continuar. Se o armazenamento estiver bloqueado, o jogo funciona sem gravação. Um novo jogo substitui a gravação deste jogo; dados do antigo ATLAS.IO não são reutilizados.

## Arte e conteúdo

- `assets/terrain.png`: 16 terrenos originais.
- `assets/props.png`: 16 objetos originais, todos usados no bairro.
- `assets/idle.png`: dois sobreviventes, quatro direções cada.
- `assets/male-walk.png`, `male-run.png`, `female-walk.png`, `female-run.png`: 64 frames de movimento.
- `assets/atlas.json`: 104 regiões individuais, medidas a partir dos ficheiros originais. Não assume uma grelha de recorte uniforme.
- `assets/concepts/`: as seis referências fornecidas pelo utilizador. São conceitos visuais, não capturas do jogo.
- `extras/godot/z_survival/`: o pacote original de terrenos e props com 32 cenas e recursos Godot. Estes extras não são necessários para o jogo web.

Os PNG originais foram preservados. O motor recorta regiões durante o desenho, ajusta a escala e encaixa terrenos através de máscaras losangulares. Os edifícios são geometria isométrica desenhada no Canvas, com interiores expostos quando a personagem se aproxima. As árvores combinam troncos geométricos e o asset de arbusto. Os errantes usam os sprites existentes com tratamento de cor; não existe uma folha de zombies independente.

## Desenvolvimento

Requer Node 20+ para verificar/empacotar; Python 3 para o servidor local opcional. Sem dependências npm, CDN, chaves ou backend.

```sh
npm run check
npm test
npm run build
npm run dev
```

Abre `http://localhost:8080`. Não abrir `index.html` diretamente por `file://`, porque os módulos e o atlas usam HTTP. O build publica apenas `dist/`. O workflow `.github/workflows/pages.yml` valida o código e os testes antes de publicar no GitHub Pages.

`src/core.js` contém o mundo determinístico, colisões, inventário, inimigos, objetivos e validação de gravações. `src/renderer.js` desenha o mundo, os sprites e o mapa. `src/game.js` controla carregamento, interface, teclado, toque e persistência.

## Limites desta versão

É uma primeira versão jogável, local e de um jogador. Não contém multiplayer, combate, construção livre, crafting complexo ou mundo infinito. Os ciclos gerados têm quatro frames por direção, algumas poses semelhantes e pequenas variações de anatomia/alinhamento. A montagem jogável não reproduz o detalhe cinematográfico das referências conceptuais.

Os testes verificam colisões, recursos, caminho aos objetivos, conclusão, gravações, integridade dos atlas e hooks da interface. Não substituem testes visuais e de toque em dispositivos reais. Nenhum asset foi extraído de Project Zomboid.
