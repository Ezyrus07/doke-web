# Testes

Estrutura preparada para unit, integration, e2e, visual e accessibility tests.

## Contrato global de layout

Rodar com o site servido em `http://127.0.0.1:5500`:

```bash
npm run test:layout-contract
```

O teste cobre `index.html`, `perfil.html`, `pedidos.html`, `mensagens.html`, `notificacoes.html`, `comunidade.html`, `resultados.html`, `detalhe-anuncio.html` e `ajuda.html` nos viewports `1366x768`, `820x1180` e `390x844`.

Ele verifica overflow horizontal, `body[data-page]`, alinhamento header/conteúdo no desktop, largura da sidebar e navegação interna por `DokeNavigate` sem reload completo. O script npm usa `--project=desktop-chrome` para evitar execução duplicada dos mesmos viewports.

