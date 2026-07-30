# ORD-001-A09B0 — Provider Adapter Boundary

## Objetivo

Preparar uma interface neutra de provedor para o runtime Node de staging. O comando genérico `próximo` não seleciona provedor e este lote não cria manifest, conta, cobrança, segredo, domínio, rede externa, deploy ou rollback.

## Estado atual

Railway permanece apenas recomendado pelo ORD-A09A. Nenhum provedor está selecionado ou vinculado. A seleção do Railway continua exigindo a frase exata `I_EXPLICITLY_SELECT_RAILWAY_FOR_DOKE_STAGING`.

O contrato B0 pode validar uma seleção fornecida somente ao processo de teste, mas não cria adapter específico nem materializa comandos. Produção permanece bloqueada.

## Contrato

O arquivo `backend/runtime/staging/provider-adapter-contract.js` estabelece provedores reconhecidos, frases exatas de seleção, validação fail-closed, plano dry-run sem rede, operações abstratas de status/deploy/rollback e bloqueio obrigatório até existir adapter específico e autorização separada.

## Estados

1. Não selecionado: estado canônico deste branch; nenhum comando está disponível.
2. Seleção explícita validada: ainda exige adapter específico e autorização separada de deploy.
3. Adapter específico: não pertence ao B0 e só pode ser criado após seleção explícita.

## Limites obrigatórios

O B0 não cria arquivos de configuração de Railway, Fly.io, Render ou Vercel; não referencia token; não chama API ou CLI externa; não executa status, deploy ou rollback; não cria infraestrutura ou cobrança; não altera staging ou produção; não usa contas ou dados reais.

## Validação local

- `node scripts/plan-ord-001-a09b0-provider-adapter.js --dry-run`
- `node scripts/test-ord-001-a09b0-provider-adapter-contract.js`
- `node scripts/audit-ord-001-a09b0-provider-adapter-boundary.js`

O modo check-env apenas valida inputs e não faz rede.

## Próximo passo

Após a frase exata de seleção do Railway, criar o adapter Railway sem secrets e executar apenas dry-run e check-env. Projeto, billing, domínio e deploy continuarão sujeitos a autorização operacional separada.
