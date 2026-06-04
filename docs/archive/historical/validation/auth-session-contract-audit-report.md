# Auth/session contract audit

Resultado esperado:

```txt
Auth/session contract audit passed.
Checked files: 5
Checked pages: 10
```

A auditoria verifica:

- arquivos de estado, sessão, permissões e auth existem;
- as 10 páginas principais carregam a camada de bootstrap;
- cada página declara `body[data-page]`;
- o App Shell mobile não está configurado como `position: fixed` no topo.
