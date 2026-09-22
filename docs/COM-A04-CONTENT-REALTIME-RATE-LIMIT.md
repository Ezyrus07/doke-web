# COM-A04 — Posts, canais, mensagens, realtime e rate limits

Contrato: `com-a04-content-realtime-rate-limit-v1`.

## Objetivo

Definir uma fronteira repository-only e fail-closed para conteúdo comunitário. O contrato reutiliza associação canônica do COM-A02 e cargos/sanções do COM-A03, sem conceder escrita, subscription, runtime, staging ou produção.

## Canais

- Tipos: `text` e `announcements`.
- Leitura exige associação ativa e interseção com `allowedRoleIds`.
- Escrita exige associação ativa, interseção com `sendRoleIds`, canal não read-only e ausência de ban, mute ou restriction ativos.
- Slow mode permitido: 0, 5, 10, 30 ou 60 segundos.
- `blockLinks` é política canônica do canal.
- Canal de anúncios exige owner ou moderator entre os papéis autorizados a enviar.
- Criar, editar ou arquivar canal exige `manageChannels`.

## Conteúdo

- Mensagem: 1–4.000 caracteres.
- Post: 1–10.000 caracteres e estado inicial `pending_moderation`.
- Anexos são apenas referências opacas; payload bruto e dados sensíveis são rejeitados.
- Editar exige autoria e revisão canônica.
- Remover exige autoria ou `deleteMessages`; hard delete é proibido.
- Fixar ou desafixar exige `pinMessages`.
- Retry idêntico retorna replay; mesma identidade com payload diferente retorna conflito.

## Rate limits

Rate limit usa snapshot `canonical_server`, relógio UTC explícito, janela, limite, uso e reset. Contadores do navegador não são autoridade. `bypassSlowMode` somente funciona quando derivado de cargo canônico.

## Realtime

- Tópicos permitidos: mensagens, presença, digitação e posts.
- Subscription exige associação e acesso ao canal no momento da emissão.
- O envelope é escopado a comunidade/canal, revisão e ator.
- Expiração máxima: 15 minutos.
- O contrato não emite token nem abre subscription real.

## Autoridade

Todas as autoridades operacionais permanecem falsas. O próximo sublote é COM-A05: denúncias, restauração, recursos e segurança de mídia.
