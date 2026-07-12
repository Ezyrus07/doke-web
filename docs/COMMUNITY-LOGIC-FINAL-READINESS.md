# Comunidade — conclusão lógica e dependências externas

## Veredito

A lógica local da Comunidade está concluída para demonstração, validação de UX e continuidade do frontend. A ativação multiusuário real ainda depende de autenticação, banco e canais em tempo real no backend.

## Pronto no frontend local

- criação, entrada e navegação em comunidades;
- canais, categorias, ordenação, não lidas e silenciamento;
- membros, cargos, permissões e visibilidade por cargo;
- mensagens, anexos, respostas, reações, edição, histórico, threads, encaminhamento e fixação;
- moderação, auditoria, antispam, slow mode, punições, banimento e restauração;
- onboarding, regras obrigatórias, convites e perfil da comunidade;
- eventos, recorrência, participantes, agenda e lembretes locais;
- notificações internas, preferências, agrupamento e ações rápidas;
- presença, digitação, leitura e sincronização entre abas do mesmo navegador;
- estados offline, reconexão, foco, teclado e proteção contra ações duplicadas.

## Simulado localmente

Estes fluxos funcionam com localStorage, eventos de storage ou enquanto uma aba está aberta:

- online, ausente e última atividade;
- “digitando…”;
- confirmação de leitura entre abas;
- notificações em tempo real entre abas;
- lembretes de eventos;
- fila offline;
- notificações nativas do navegador sem push remoto.

Eles são adequados para teste local, mas não representam sincronização real entre dispositivos.

## Dependente de backend/Supabase

- persistência compartilhada entre usuários e dispositivos;
- autenticação e identidade confiáveis;
- mensagens e eventos em tempo real remoto;
- Presence e Broadcast do Supabase;
- políticas RLS e autorização no servidor;
- upload persistente de anexos;
- push notifications com service worker e servidor;
- execução de lembretes com o site fechado;
- consistência transacional para punições, cargos e eventos;
- paginação e busca server-side;
- exclusão definitiva e desfazer persistente.

## Bloqueadores encontrados nesta auditoria

Nenhum bloqueador lógico novo foi identificado nos arquivos presentes no acumulativo reduzido.

Quatro contratos não podem ser executados neste pacote porque dependem de arquivos externos que não foram incluídos:

- comunidade.html;
- assets/js/repositories/notifications-repository.js.

Essas ausências são limitações do ZIP acumulativo de arquivos alterados, não falhas confirmadas da implementação.

## Critério para considerar a lógica encerrada

A lógica da Comunidade pode ser considerada encerrada no escopo frontend/local. Novos trabalhos devem se limitar a:

1. correção de regressão comprovada;
2. integração futura com provider/backend;
3. testes manuais em navegador;
4. refinamento visual sem alteração dos contratos funcionais.

## Gate antes da integração com Supabase

- preservar os atributos data-* usados pelos controladores;
- manter IDs e timestamps estáveis;
- substituir repositories/providers, não os renderers;
- implementar RLS antes de ativar escrita real;
- testar migração com dados locais descartáveis;
- ativar recursos em canário, começando por leitura e depois escrita.
