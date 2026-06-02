# Baseline visual aprovado

Este documento congela o estado visual aprovado para orientar refatorações futuras. Ele não autoriza redesign; ele define o que precisa ser preservado enquanto reduzimos dívida técnica.

## Regra principal

Toda mudança em CSS, shell, header, rail, scroll, roteador ou links de assets deve preservar o baseline abaixo, salvo quando Gabriel aprovar explicitamente uma mudança visual.

## Home / `index.html`

Status: **baseline aprovado após correção do mobile pós-hidratação**.

### Mobile

A home mobile deve manter estes comportamentos:

- o primeiro frame e o estado final depois de `doke-mobile-shell-mounted` devem convergir para o mesmo layout;
- `Destaques para você` deve exibir cards legíveis em rail horizontal, sem virar tiras verticais;
- `Mais anúncios` deve exibir cards legíveis em rail horizontal, sem virar tiras verticais;
- `Publicações em destaque` deve manter o respiro entre imagem e título;
- `Workers` deve continuar estável, com o contrato mobile aprovado;
- não pode haver overflow horizontal na página;
- a home não pode depender de um frame intermediário correto e depois quebrar após hidratação.

### Desktop/tablet

- `Workers` deve preservar o formato vertical aprovado;
- os cards de anúncio e publicação devem preservar hierarquia, espaçamento e CTA aprovados;
- header, conteúdo e rails devem continuar alinhados;
- qualquer ajuste em tablet/Safari não pode sobrescrever o contrato mobile de telefone.

## Páginas internas mínimas protegidas

As páginas abaixo devem ser tratadas como baseline visual sensível durante alterações globais:

- `perfil.html`
- `pedidos.html`
- `mensagens.html`
- `notificacoes.html`
- `comunidade.html`
- `resultados.html`
- `detalhe-anuncio.html`
- `ajuda.html`

## Protocolo para regressão visual

Se uma regressão aparecer depois de refresh, rota interna ou hidratação:

1. identificar a regra vencedora real antes/depois da hidratação;
2. registrar `body.className`, `body[data-page]` e classes do `html`;
3. comparar computed styles dos elementos afetados;
4. corrigir a autoridade real, não criar camada nova por cima;
5. validar F5 e `DokeNavigate(...)`.

## Critério mínimo de aceite

Antes de entregar uma refatoração que toque áreas críticas, registrar:

- páginas testadas;
- viewports testados;
- se houve mudança visual intencional;
- se houve overflow horizontal;
- se a navegação interna ficou equivalente ao carregamento direto.
