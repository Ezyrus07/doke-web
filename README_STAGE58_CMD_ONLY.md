# Doke Stage 58 — Delete seguro via CMD

Este pacote não usa PowerShell. Ele usa apenas CMD/BAT padrão do Windows.

## Arquivos

- `DOKE_DELETE_SAFE_STAGE58_CMD_ONLY.cmd`: script principal.
- `RODAR_STAGE58_CMD_ONLY.bat`: atalho para executar.
- `DELETE_SAFE_STAGE58.txt`: lista segura de arquivos a deletar.

## Como aplicar

1. Extraia este ZIP.
2. Copie os 3 arquivos acima para a raiz do projeto Doke, onde fica `index.html`.
3. Clique duas vezes em `RODAR_STAGE58_CMD_ONLY.bat`.
4. Confirme com `S` quando o terminal perguntar.
5. O script vai gerar `stage58-delete-log.txt`.

## Se o Windows bloquear

Clique com o botão direito no ZIP baixado, vá em Propriedades, marque Desbloquear, aplique e extraia de novo.

Alternativa: abra `cmd` na raiz do projeto e execute:

```cmd
DOKE_DELETE_SAFE_STAGE58_CMD_ONLY.cmd
```
