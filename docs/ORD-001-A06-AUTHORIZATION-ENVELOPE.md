# ORD-001 / ORD-A06 — Envelope de autorização operacional

## Objetivo

Transformar autorização humana em um artefato operacional curto, verificável e não reutilizável em recursos diferentes.

Este envelope não contém e-mail, senha, UUID, URL, referência de serviço, token ou service-role key. Ele contém somente fingerprints SHA-256, escopo, timestamps e identificadores não pessoais.

## Regra central

Capacidade técnica não equivale a autorização.

O Playwright real continua bloqueado até que um envelope válido seja emitido e fornecido ao executor junto com seu SHA-256.

## Vinculações obrigatórias

O envelope é vinculado a:

- um único `runId` iniciado por `ord-a06-`;
- um marcador explícito de staging;
- uma conta cliente;
- uma conta profissional distinta;
- um serviço publicado autorizado;
- URL da interface web;
- URL da API;
- URL do Supabase;
- execução de no máximo um pedido;
- cleanup obrigatório;
- produção proibida.

A vinculação dos recursos e destinos é feita por SHA-256. Alterar uma conta, serviço, URL, `runId` ou marcador invalida o envelope.

## Validade e replay

- TTL mínimo: 5 minutos;
- TTL máximo: 120 minutos;
- timestamps ISO obrigatórios;
- envelope expirado é rejeitado;
- envelope emitido no futuro é rejeitado;
- arquivo e digest precisam corresponder;
- o arquivo precisa ficar fora do working tree do repositório;
- sobrescrita é recusada pelo preparador.

## Frases explícitas

O preparador exige simultaneamente:

- `DOKE_ORD_A06_AUTHORIZATION_ACK=I_AUTHORIZE_ORD_A06_STAGING_TEST_ACCOUNTS`
- `DOKE_ORD_A06_AUTHORIZATION_DECISION=I_EXPLICITLY_AUTHORIZE_ORD_A06_VISUAL_CANARY`

A segunda frase representa a decisão operacional específica de emitir o envelope. O simples comando “próximo” não é interpretado como essa autorização.

## Modos do preparador

### Dry-run

```bash
npm run prepare:ord-001-a06-authorization-envelope:dry-run
```

Somente imprime o plano. Não lê credenciais, não grava arquivo, não abre navegador, não acessa a rede e não executa mutações.

### Check-env

```bash
npm run prepare:ord-001-a06-authorization-envelope:check-env
```

Valida todas as entradas e constrói o envelope apenas em memória. Não grava o arquivo.

### Write

```bash
npm run prepare:ord-001-a06-authorization-envelope
```

Exige também:

```text
DOKE_ORD_A06_WRITE_AUTHORIZATION=1
```

O arquivo é criado com escrita exclusiva e modo `0600` onde suportado.

## Variáveis do preparador

```text
DOKE_ENVIRONMENT
DOKE_ORD_A06_AUTHORIZATION_ACK
DOKE_ORD_A06_AUTHORIZATION_DECISION
DOKE_ORD_A06_WRITE_AUTHORIZATION
DOKE_ORD_A06_AUTHORIZATION_ID
DOKE_ORD_A06_AUTHORIZATION_OUTPUT_PATH
DOKE_ORD_A06_AUTHORIZATION_TTL_MINUTES
DOKE_ORD_A06_WEB_BASE_URL
DOKE_ORD_A06_API_BASE_URL
DOKE_ORD_A06_SUPABASE_URL
DOKE_ORD_A06_CLIENT_EMAIL
DOKE_ORD_A06_PROFESSIONAL_EMAIL
DOKE_ORD_A06_SERVICE_REF
DOKE_ORD_A06_RUN_ID
DOKE_ORD_A06_TARGET_MARKER
```

Senhas e service-role key não são necessárias para emitir o envelope. Elas permanecem exclusivas do ambiente posterior do executor.

## Variáveis adicionais do executor

Depois da emissão, o executor exige:

```text
DOKE_ORD_A06_AUTHORIZATION_MANIFEST_PATH
DOKE_ORD_A06_AUTHORIZATION_MANIFEST_SHA256
```

O executor recalcula o digest, valida o TTL, verifica que o arquivo está fora do repositório e compara todos os fingerprints com as entradas reais do processo.

## Privacidade

O GitHub armazena somente:

- contrato do envelope;
- preparador;
- auditor;
- evidência booleana;
- documentação;
- workflow estático.

Nenhum envelope emitido deve ser versionado. Nenhuma credencial ou valor bruto de recurso deve aparecer em logs, relatórios ou screenshots.

## Estado atual

- contrato implementado;
- preparador implementado;
- emissão real não executada;
- nenhuma autorização operacional presumida;
- nenhuma conta utilizada;
- nenhuma rede ou mutação executada;
- produção intocada.
