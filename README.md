# ✳ VIDA NOVA

Um simulador de vida original, inspirado na mecânica de escolhas anuais popularizada por jogos como BitLife. Interface em português europeu, desenhada para Android e browser desktop.

## Jogabilidade

Cria uma pessoa, personaliza nome, país, identidade e cor de perfil. Avança um ano de cada vez, lida com acontecimentos aleatórios, gere saúde, felicidade, inteligência, carisma, relações, família, educação, trabalho, salários, despesas, poupanças, investimentos, automóveis e imóveis. No fim da vida, vê o legado e começa outra história.

As decisões têm efeitos persistentes, e o jogo grava automaticamente em `localStorage`. A vida anterior não é importada do antigo projeto AFTERFALL; o novo jogo começa do zero.

## Como executar

Sem dependências nem instalação, exceto um navegador moderno e acesso à internet para a fonte opcional da Google.

```sh
python3 -m http.server 8080
# abrir http://localhost:8080
npm run check
npm test
```

## Publicação

GitHub Pages é publicado a partir de `.github/workflows/pages.yml` quando há push para `main`. O endereço é https://pulsebreakpt.github.io/NeonInfiniteCity/.

## Arquitetura

- `src/engine.js`: motor de jogo puro e testável, progressão anual, eventos, profissões, atividades, economia e gravação validada.
- `src/app.js`: renderização, navegação, feedback e ligação entre UI e motor.
- `style-1.css`, `style-2.css`, `style-3.css`: design responsivo mobile-first, sem bibliotecas de interface.
- `tests/engine.test.js`: testes de lógica, proteção de estados e progressão.

## Nota

O nome, os textos, a interface e as regras foram escritos para este projeto. Não inclui recursos, código ou marcas de BitLife. O jogo está num repositório que anteriormente continha AFTERFALL; os ficheiros antigos são substituídos, mas o histórico Git continua acessível.
