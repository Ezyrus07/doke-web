# Mobile Lock v4

Correção pequena aplicada depois da v3.

## Ajustes

- Centraliza verticalmente o texto/placeholder do input mobile usando altura real de linha no campo, sem alterar o shell.
- Remove resíduos visuais das tabs de `resultados.html` no mobile, incluindo a linha/contorno que ainda aparecia acima da busca.
- Mantém o header e a busca do `resultado.html` com o mesmo espaçamento vertical do `index.html`.
- Atualiza o cache de `mobile-chrome-lock.css` para `v4`.

## Arquivo principal

- `assets/css/components/navigation/mobile-chrome-lock.css`

Esse patch é propositalmente pequeno para não reabrir problemas de overflow e layout global.
