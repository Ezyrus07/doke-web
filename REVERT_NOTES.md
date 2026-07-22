# Revert notes — SEC-001 financial RPC authority

A reversão não deve restaurar grants amplos nem `EXECUTE` para `PUBLIC`.

Em caso de regressão funcional:

1. mantenha `anon` sem grants financeiros;
2. mantenha as RPCs legadas de dinheiro e idempotência fora da Data API;
3. desative temporariamente a chamada da Edge Function no frontend, preservando o fail-closed;
4. reverta apenas a função/RPC afetada por uma migration aditiva e auditável;
5. execute novamente os 26 canários com rollback.

Não reaplique migrations antigas e não restaure `TRUNCATE`, `REFERENCES` ou `TRIGGER` para papéis de API.
