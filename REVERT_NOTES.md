# Reversão — SEC-001 autoridade profissional e KYC

A reversão deve ocorrer por migration corretiva; migrations aplicadas não devem ser removidas do histórico.

Ordem de contenção:

1. manter RLS nas três tabelas de KYC;
2. manter o bucket privado;
3. se a Edge Function falhar, corrigir a função sem reabrir DML direto ao navegador;
4. não restaurar a RPC antiga de submissão direta;
5. não gravar `role` ou `account_role` em `raw_user_meta_data`;
6. preservar os objetos reais e o histórico de verificação;
7. intents preparados podem ser marcados como `cancelled`/`expired` sem apagar documentos;
8. em emergência, o `service_role` pode reparar estados após auditoria.

Para desativação operacional imediata, despublique `professional-verification-operations` e mantenha o KYC somente para leitura até a correção. Nenhuma reversão visual se aplica: HTML e CSS não foram alterados.
