# MSG-001 A06 — Private Presence and Typing Boundary

## Resultado

O lote substitui o mecanismo local de presença, digitação e recibo de leitura do chat por uma fronteira efêmera, privada e participant-scoped do Supabase Realtime.

A implementação permanece **repository-only e desativada por padrão**. Nenhuma policy foi aplicada em staging, nenhum canal remoto foi ativado e nenhuma mensagem real foi alterada.

## Causa raiz

O mecanismo legado usava `localStorage` para três autoridades concorrentes:

- presença;
- indicador de digitação;
- recibo de leitura.

A identidade era inferida de chaves locais e o identificador da sala podia ser derivado do DOM. Isso não representava estado cross-device, não provava participação na conversa e podia deixar estado obsoleto após troca de sessão ou conversa.

## Autoridade congelada

Para sessões autenticadas UUID:

- transporte: canal privado Supabase Realtime;
- tópico: `doke:conversation:<conversation_uuid>:ephemeral`;
- autorização: políticas RLS em `realtime.messages` com prova em `public.conversations`;
- presença: extensão `presence`;
- digitação: extensão `broadcast`, evento `typing`;
- persistência local: proibida;
- autoridade durável de mensagens: nenhuma.

Sessões fixture ou sem UUID não abrem canal remoto e não persistem estado.

## Privacidade

O canal não transmite nome, e-mail ou perfil. O estado de presença contém somente um identificador aleatório da conexão, visibilidade e instante de entrada.

O indicador de digitação é deliberadamente genérico: `Alguém está digitando…`. O payload não é aceito como prova de identidade.

## Lifecycle

- throttle de digitação: 1 segundo;
- expiração: 6 segundos;
- desconexão obrigatória ao mudar conversa, sessão ou página;
- timers descartados no disconnect;
- canal global ou sem conversation UUID: proibido;
- falha de autorização: fail-closed, sem fallback local.

## Recibos de leitura

A06 remove o recibo de leitura local deste módulo. `markRead` continua sob o comando server-owned de A03 e sua projeção deve chegar pela leitura remota canônica de A04.

## Migration preparada

`20260802234000_msg_a06_presence_typing_realtime_authorization_contract.sql` prepara:

1. função fail-closed que valida o formato do tópico e a participação na conversa;
2. policy `SELECT` para receber Presence/Broadcast;
3. policy `INSERT` para enviar Presence/Broadcast;
4. nenhuma permissão de `UPDATE` ou `DELETE`.

A migration não foi aplicada.

## Feature flag

`messagesPresenceEnabled` permanece `false`.

A ativação exige autorização explícita nova, aplicação das policies em staging e canários autenticados com dois participantes e um terceiro usuário não participante.

## Segurança operacional

- staging reads: 0;
- staging mutations: 0;
- migrations aplicadas: 0;
- policies Realtime aplicadas: 0;
- canais remotos ativos por padrão: 0;
- deploys: 0;
- produção: intocada;
- mensagens ou contas reais alteradas: 0;
- merge: 0.
