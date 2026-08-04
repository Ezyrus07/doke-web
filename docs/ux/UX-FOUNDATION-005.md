# UX-FOUNDATION-005 — Matriz canônica de cards e variantes permitidas

## Status

- Frente: `UX-FOUNDATION`
- Sublote: `005`
- Natureza: especificação de Produto, UX, UI, acessibilidade e QA
- Branch: `ux/ux-foundation-001`
- Escopo desta entrega: documentação somente
- Runtime alterado: não
- Staging acessado: não
- Produção acessada: não
- Merge autorizado: não
- Head lógico inspecionado: `243f38c88dea90044dd0bf237a79a14db1f2bf97`
- Dependências: `UX-FOUNDATION-001`, `002`, `003` e `004`

---

## 1. Objetivo

Definir uma matriz canônica para todos os cards de descoberta da Doke, eliminando a ambiguidade entre:

- anúncio;
- profissional;
- Worker;
- publicação;
- card normal;
- card de resultados;
- card relacionado;
- card favorito;
- card de skeleton;
- card editorial;
- card remoto;
- card de demonstração.

O objetivo não é redesenhar visualmente todos os cards.

O objetivo é impedir que cada página crie uma anatomia, um renderer, uma semântica de preço, um tratamento de mídia e um comportamento de favoritos próprios.

---

## 2. Resultado esperado

Depois dos handoffs futuros, a plataforma deverá possuir:

1. uma única autoridade de dados por família de card;
2. uma única autoridade de renderização por família;
3. uma anatomia estável por família;
4. poucas variantes explícitas e testáveis;
5. páginas responsáveis apenas pela composição de grid ou rail;
6. ausência de dimensões exatas por item ou `nth-of-type`;
7. ausência de renderers de fallback com anatomia diferente;
8. comportamento determinístico para mídia, texto, preço, avaliação e favoritos;
9. skeleton geometricamente equivalente ao card final;
10. distinção explícita entre conteúdo canônico, editorial e demonstrativo.

---

## 3. Fora de escopo

Este documento não:

- altera HTML;
- altera CSS;
- altera JavaScript;
- remove renderers existentes;
- altera o catálogo remoto;
- altera favoritos;
- altera perfis;
- altera Workers;
- altera publicações;
- cria métricas reais;
- cria novos dados de demonstração;
- decide monetização;
- aplica mudanças em staging;
- aplica mudanças em produção.

---

## 4. Evidências inspecionadas

### 4.1 Anúncios

- `assets/js/components/public-service-card.js`
- `assets/js/renderers/service-card-renderer.js`
- `assets/js/pages/home/public-services.js`
- `assets/js/pages/search-results.js`
- `assets/js/pages/detalhe-anuncio.js`
- `assets/css/components/cards/marketplace-card-contract.css`
- `assets/css/components/cards/service-card.css`
- `assets/css/components/cards/search-results-service-card-contract.css`
- `assets/css/components/cards/marketplace-responsive-card-stack.css`
- `assets/css/components/cards/mobile-card-contract.css`

### 4.2 Profissionais

- `index.html`
- `assets/js/pages/search-results.js`
- `assets/css/components/cards/professional-showcase-card.css`

### 4.3 Workers

- `index.html`
- `assets/js/pages/home/workers.js`
- `assets/css/components/cards/marketplace-card-contract.css`

### 4.4 Publicações

- `index.html`
- `assets/js/pages/home/before-after.js`
- `assets/css/components/cards/marketplace-card-contract.css`

### 4.5 Loading e skeleton

- `assets/css/components/states/component-loading-contract.css`
- skeletons da Home e de Resultados

---

## 5. Diagnóstico executivo

A Doke já possui um bom componente recente para anúncios, mas ainda mantém outras autoridades paralelas.

Atualmente existem, no mínimo:

- `Doke.publicServiceCard.create`;
- `Doke.renderers.serviceCard`;
- fallback local de `createServiceCard` em Resultados;
- CSS para `.doke-ad-card`;
- CSS para `.service-card`;
- contrato específico de `.service-card--result`;
- overrides responsivos globais;
- tamanhos exatos por página, breakpoint e posição.

Isso permite que o mesmo anúncio apresente diferenças em:

- título;
- identidade do profissional;
- imagem;
- preço;
- avaliação;
- tags;
- favorito;
- badge;
- altura;
- CTA;
- comportamento mobile.

A causa raiz não é falta de CSS.

A causa raiz é múltipla autoridade de anatomia e renderização.

---

## 6. Achados críticos

### CARD-P0-01 — múltiplos renderers de anúncio

O catálogo público da Home usa `Doke.publicServiceCard.create`.

O repositório também mantém `Doke.renderers.serviceCard` com estrutura, classes e normalização próprias.

Resultados mantém ainda um renderer de fallback local quando `Doke.publicServiceCard` não está disponível.

Três renderers para a mesma entidade criam três interpretações de negócio.

#### Risco

- preço divergente;
- favorito divergente;
- identidade divergente;
- placeholder divergente;
- tags divergentes;
- semântica de avaliação divergente;
- correção aplicada em uma página e ausente nas demais.

#### Decisão

A autoridade candidata imediata para anúncios é:

```text
Doke.publicServiceCard.create
```

Os demais renderers deverão ser eliminados ou convertidos em adapters finos para essa autoridade.

---

### CARD-P0-02 — elemento interativo dentro de link

`service-card-renderer.js` cria a mídia como `<a>` e insere o botão de favorito dentro desse link.

Isso produz controles interativos aninhados.

#### Consequências

- HTML inválido ou semanticamente inconsistente;
- ativação imprevisível por teclado;
- clique no favorito pode navegar;
- leitores de tela podem anunciar relações incorretas;
- eventos precisam compensar uma estrutura inadequada.

#### Regra

Nenhum card poderá conter:

```text
button dentro de a

a dentro de button

controle interativo dentro de outro controle interativo
```

---

### CARD-P0-03 — identidade de profissional fabricada

O componente público pode gerar um `@handle` a partir do nome do profissional quando não existe username real.

Resultados também associa avatares de demonstração com base em nomes ou palavras da profissão.

#### Risco

- exibir um username que não pertence à pessoa;
- associar fotografia incorreta a um usuário;
- criar identidade visual falsa;
- permitir confusão ou personificação involuntária.

#### Regra

A interface nunca deverá fabricar:

- username;
- handle;
- foto;
- selo de verificação;
- localização;
- avaliação;
- contagem de avaliações.

Quando o handle não existir, mostrar o nome real.

Quando a foto não existir, mostrar iniciais ou placeholder neutro.

---

### CARD-P0-04 — badge default sem significado para o cliente

O card público usa `Publicado` quando não recebe badge.

Outro renderer usa `Em destaque` como fallback.

Esses estados não são equivalentes.

`Publicado` é um status interno pouco útil ao cliente.

`Em destaque` implica decisão editorial ou comercial que precisa de autoridade real.

#### Regra

Badge não terá fallback textual automático.

Sem dado válido:

```text
badge = ausente
```

---

### CARD-P0-05 — preço normalizado de maneiras diferentes

Os renderers consideram combinações diferentes de:

- `price`;
- `priceValue`;
- `startingPrice`;
- `priceLabel`;
- `priceMode`;
- `pricingType`.

Um card pode mostrar `Sob orçamento`, enquanto outro mostra um valor.

#### Regra

Todo card de anúncio deverá receber um `pricing` normalizado antes da renderização.

A renderização não deverá inferir livremente o modelo comercial.

---

### CARD-P0-06 — múltiplas autoridades CSS

A anatomia do anúncio é afetada simultaneamente por:

- `marketplace-card-contract.css`;
- `service-card.css`;
- `search-results-service-card-contract.css`;
- `marketplace-responsive-card-stack.css`;
- contratos mobile;
- CSS de página.

#### Risco

A regra vencedora depende de:

- ordem de importação;
- especificidade;
- classe histórica usada pelo renderer;
- breakpoint;
- presença de `!important`.

#### Regra

Uma família de card deverá possuir:

1. base compartilhada;
2. arquivo de anatomia da família;
3. arquivo opcional de densidade;
4. zero correções anatômicas na página.

---

### CARD-P0-07 — geometria exata por card

A camada responsiva contém alturas e larguras decimais específicas para:

- determinado breakpoint;
- determinado `nth-of-type`;
- cards relacionados;
- Workers;
- Publicações.

Exemplos de padrão proibido:

```text
height: 425.83px !important

width: 72.86px !important

:nth-of-type(3)
```

#### Risco

- layout quebrado ao mudar texto;
- quebra ao mudar fonte;
- quebra ao receber dado real;
- manutenção por captura visual, não por sistema;
- impossibilidade de reutilização.

#### Regra

Cards serão dimensionados por:

- largura do container;
- `minmax`;
- `aspect-ratio` da mídia;
- conteúdo;
- tokens de densidade;
- line clamp.

Nunca por dimensões capturadas de um item específico.

---

### CARD-P0-08 — Workers e Publicações sem renderer canônico

Workers e Publicações da Home são majoritariamente estruturas estáticas vinculadas a IDs de demonstração.

O modal possui dados próprios.

A página de Resultados constrói estruturas próprias.

#### Risco

- card e modal descrevem conteúdos diferentes;
- dados editoriais parecem remotos;
- métricas demonstrativas parecem reais;
- novas páginas copiam HTML.

#### Regra

Antes de integrar dados reais, cada família deverá possuir:

- schema de dados;
- renderer único;
- origem explícita;
- variantes permitidas;
- política de métricas.

---

## 7. Princípios canônicos

### 7.1 Uma entidade, um renderer

```text
ServiceCardData
→ ServiceCardRenderer

ProfessionalCardData
→ ProfessionalCardRenderer

WorkerCardData
→ WorkerCardRenderer

PublicationCardData
→ PublicationCardRenderer
```

### 7.2 Página controla composição, não anatomia

A página pode controlar:

- número de colunas;
- largura do rail;
- gap;
- quantidade visível;
- ordem da coleção;
- paginação;
- progressive reveal.

A página não pode controlar:

- ordem dos slots internos;
- tamanho do favorito;
- altura da mídia por item;
- estilo do preço;
- clamp do título;
- estrutura de identidade;
- badge;
- tratamento de imagem ausente;
- estados internos.

### 7.3 Variante é contrato, não nome de página

Não criar anatomias como:

```text
card-da-home

card-de-resultados

card-do-perfil
```

Criar variantes semânticas:

```text
standard
compact
portrait
skeleton
```

### 7.4 Origem sempre explícita

Todo card deverá possuir origem conhecida:

```text
canonical_remote
personalized_remote
editorial_local
demo_fixture
```

---

## 8. Modelo compartilhado de proveniência

```ts
type CardSource = {
  kind:
    | 'canonical_remote'
    | 'personalized_remote'
    | 'editorial_local'
    | 'demo_fixture';
  authority: string;
  fetchedAt?: string;
  stale?: boolean;
  metricsAreReal: boolean;
};
```

### Regras

- `demo_fixture` nunca será apresentado como dado remoto;
- métricas demonstrativas não poderão parecer métricas oficiais;
- `stale` pode manter conteúdo visível, acompanhado de estado de refresh;
- cards editoriais não deverão desaparecer porque uma fonte remota vazia falhou;
- dados personalizados exigem identidade autenticada e estados próprios.

---

# PARTE A — CARD DE ANÚNCIO

## 9. Autoridade do card de anúncio

### Curto prazo

```text
JavaScript:
assets/js/components/public-service-card.js

API:
Doke.publicServiceCard.create
```

### CSS candidato principal

```text
assets/css/components/cards/marketplace-card-contract.css
```

### Compatibilidade temporária

As famílias `.service-card` e `.doke-ad-card` poderão coexistir apenas durante migração.

A anatomia final deverá ter uma única família de classes.

---

## 10. ServiceCardData canônico

```ts
type ServicePricing =
  | { mode: 'fixed'; amount: number; currency: 'BRL' }
  | { mode: 'starting_at'; amount: number; currency: 'BRL' }
  | { mode: 'budget' }
  | { mode: 'free' };

type ServiceRating = {
  average: number | null;
  count: number;
};

type ServiceProviderSummary = {
  id: string;
  name: string;
  handle: string | null;
  avatarUrl: string | null;
  verified: boolean;
};

type ServiceCardData = {
  id: string;
  publicId?: string;
  title: string;
  category: string;
  imageUrl: string | null;
  imageAlt?: string | null;
  provider: ServiceProviderSummary;
  rating: ServiceRating;
  pricing: ServicePricing;
  locationLabel: string | null;
  tags: string[];
  badge: ServiceBadge | null;
  favorite: FavoriteProjection;
  href: string;
  source: CardSource;
};
```

### Campos obrigatórios

- `id`;
- `title`;
- `category`;
- `provider.id`;
- `provider.name`;
- `pricing`;
- `href`;
- `source`.

### Campos opcionais honestos

- imagem;
- handle;
- avatar;
- avaliação;
- localização;
- tags;
- badge;
- favorito quando o usuário estiver autenticado.

---

## 11. Anatomia canônica do anúncio

Ordem dos slots:

```text
article
├── media
│   ├── image | placeholder
│   ├── badge opcional
│   └── favorite opcional
└── body
    ├── category
    ├── title
    ├── provider
    │   ├── avatar | initials
    │   ├── name | real handle
    │   └── rating opcional
    ├── tags opcionais
    ├── location opcional
    └── footer
        ├── price
        └── CTA
```

### Ordem invariável

A ordem não muda entre Home, Favoritos, Resultados e relacionados.

Variantes podem reduzir densidade, mas não reorganizar significado.

---

## 12. Variantes permitidas do anúncio

### 12.1 `standard`

Uso:

- Destaques da Home;
- Mais anúncios;
- Favoritos;
- Resultados;
- coleções principais.

Slots:

- mídia;
- badge opcional;
- favorito;
- categoria;
- título;
- profissional;
- avaliação;
- até duas tags;
- localização;
- preço;
- CTA.

### 12.2 `compact`

Uso:

- relacionados no detalhe;
- rail estreito explicitamente aprovado.

Pode ocultar:

- tags;
- localização, se o container for estreito.

Não pode ocultar:

- título;
- profissional;
- preço;
- CTA;
- favorito quando suportado.

### 12.3 `skeleton`

Uso:

- loading inicial;
- loading localizado.

Deverá usar a mesma caixa da variante final.

### 12.4 Variantes proibidas

```text
results com anatomia própria
home com ordem própria
favoritePreview com dados diferentes
nth-of-type variant
viewport-captured variant
```

---

## 13. Título do anúncio

### Regras

- máximo visual: duas linhas;
- sem truncamento para uma linha como regra geral;
- line clamp consistente;
- `title` ou tooltip não substitui texto acessível;
- título completo permanece disponível no nome acessível do link;
- não reduzir fonte por item.

### Testes

- 8 caracteres;
- 35 caracteres;
- 80 caracteres;
- 140 caracteres;
- palavra sem espaços;
- emoji;
- acentos;
- caracteres especiais.

---

## 14. Categoria

- uma linha;
- texto real;
- sem correção artificial de acentos no renderer;
- sem alias visual divergente do filtro;
- truncamento por ellipsis permitido;
- categoria desconhecida usa `Serviço`, mas deve gerar diagnóstico de dados.

---

## 15. Identidade do profissional

### Prioridade visual

```text
handle real
ou
nome real
```

### Proibido

- gerar `@handle` do nome;
- usar `@profissional` como se fosse username;
- escolher foto por profissão;
- escolher foto por nome;
- mostrar selo sem dado real.

### Avatar

```text
avatar real válido
→ imagem

sem avatar
→ iniciais do nome

sem nome válido
→ placeholder DK
```

---

## 16. Avaliação

### Com avaliações

Exibir quando:

```text
count > 0
average válido entre 0 e 5
```

Formato:

```text
★ 4,9 (128 avaliações)
```

### Sem avaliações

Opções permitidas:

```text
Novo
```

ou ausência do slot.

### Proibido

```text
0,0 (0 avaliações)

NaN

undefined avaliações
```

---

## 17. Preço

### `fixed`

```text
R$ 120
```

### `starting_at`

```text
A partir de R$ 120
```

### `budget`

```text
Sob orçamento
```

### `free`

```text
Grátis
```

### Regras

- `0` não vira automaticamente `Sob orçamento`;
- ausência de preço não permite inferir `free`;
- `priceLabel` bruto não vence o modelo normalizado;
- moeda sempre vem do contrato;
- card e detalhe devem usar o mesmo formatter.

---

## 18. Badges de anúncio

```ts
type ServiceBadge =
  | 'featured'
  | 'new'
  | 'available_today'
  | 'guaranteed'
  | 'emergency';
```

### Regras

- máximo de um badge principal na mídia;
- badge depende de dado verificável;
- `featured` exige curadoria ou regra real;
- `new` exige janela temporal definida;
- `available_today` exige disponibilidade real;
- `guaranteed` exige atributo do serviço;
- `emergency` exige capacidade declarada.

### Proibido em descoberta

- Publicado;
- Ativo;
- Sincronizado;
- Em análise;
- status de moderação;
- status interno do owner.

Esses estados pertencem a superfícies de gestão do anúncio.

---

## 19. Tags

- máximo visual de duas;
- armazenar sem `#` no domínio;
- renderer decide prefixo visual, se aprovado;
- não duplicar categoria;
- não mostrar tag vazia;
- não permitir quebra em múltiplas linhas;
- não transformar tag em botão sem ação real.

---

## 20. Localização

- uma linha;
- formato normalizado;
- não inventar cidade default;
- ausência válida oculta o slot;
- não usar localização do usuário como localização do profissional;
- não mostrar endereço preciso em card público.

Formato esperado:

```text
Belo Horizonte, MG
```

---

## 21. Mídia do anúncio

### Estados

```text
loading
ready
missing
error
```

### `missing`

Mostrar placeholder neutro da Doke ou da categoria.

Não deixar um bloco vazio sem comunicação visual.

### `error`

Substituir pela mesma geometria do placeholder.

### Regras de performance

- `aspect-ratio` estável;
- largura e altura previsíveis;
- primeira linha visível pode usar prioridade maior;
- demais imagens usam lazy loading;
- sem layout shift ao falhar;
- `object-fit: cover`;
- não usar imagem externa escolhida pelo nome da categoria como dado real.

### Texto alternativo

Quando a imagem apenas repete o conteúdo do card:

```text
alt=""
```

Quando a imagem comunica informação indispensável:

```text
alt específico e curto
```

Evitar:

```text
Imagem de Serviço profissional
```

como fallback genérico repetitivo.

---

## 22. Favoritos

```ts
type FavoriteProjection = {
  supported: boolean;
  state:
    | 'loading'
    | 'ready_off'
    | 'ready_on'
    | 'pending_add'
    | 'pending_remove'
    | 'auth_required'
    | 'error';
};
```

### Autoridade

```text
Doke.serviceFavoritesController
```

### Regras

- uma única autoridade de evento;
- `aria-pressed` sincronizado;
- target mínimo de 44 × 44 CSS pixels;
- estado pendente impede clique repetido;
- erro restaura estado anterior;
- feedback somente após resultado conhecido;
- evento de broadcast não gera toast duplicado;
- card sem ID canônico não oferece favorito funcional;
- nenhum listener visual paralelo deve simular favorito local.

---

## 23. CTA e navegação

### CTA primário

```text
Ver anúncio
```

### Regras

- CTA sempre aponta para o mesmo ID usado pelo card;
- card não poderá ter link envolvendo o botão favorito;
- se toda a superfície for clicável, usar estratégia de stretched link que não envolva outros controles;
- não duplicar navegação em múltiplos elementos sem necessidade;
- foco visível obrigatório.

---

# PARTE B — CARD DE PROFISSIONAL

## 24. ProfessionalCardData

```ts
type ProfessionalCardData = {
  id: string;
  name: string;
  handle: string | null;
  avatarUrl: string | null;
  profession: string;
  rating: {
    average: number | null;
    count: number;
  };
  verified: boolean;
  locationLabel: string | null;
  availabilityLabel: string | null;
  badges: string[];
  href: string;
  source: CardSource;
};
```

---

## 25. Anatomia do profissional

```text
article
├── badge opcional
├── avatar | initials
├── identity
│   ├── name
│   ├── verified opcional
│   ├── profession
│   ├── rating opcional
│   └── location opcional
└── CTA
```

---

## 26. Variantes do profissional

### `discovery`

Uso:

- Home;
- Resultados;
- sugestões de perfis.

### `compact`

Uso:

- relacionados;
- menções curtas.

### `skeleton`

Mesma geometria da variante final.

### Proibido

- mapear avatar por nome;
- mapear avatar por profissão;
- criar `Novo` sem data;
- esconder verificação porque o CSS antigo não previa o slot;
- usar cards de resultados com HTML criado diretamente na página.

---

## 27. Nome, profissão e avaliação

### Nome

- até duas linhas;
- nunca substituir por handle;
- handle pode ser informação secundária.

### Profissão

- uma linha;
- texto real do perfil;
- sem inferência pela busca.

### Avaliação

Mesmas regras do card de anúncio.

---

## 28. Verificação

- selo somente com autoridade real;
- nome acessível deve incluir `Perfil verificado`;
- tooltip não pode ser a única explicação;
- não usar apenas cor;
- selo não altera ranking por si só.

---

# PARTE C — CARD DE WORKER

## 29. WorkerCardData

```ts
type WorkerCardData = {
  id: string;
  title: string;
  posterUrl: string | null;
  videoUrl: string | null;
  durationSeconds: number | null;
  provider: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  category: string | null;
  metrics: {
    likes: number | null;
    saves: number | null;
    comments: number | null;
  };
  href: string;
  previewHref?: string;
  source: CardSource;
};
```

---

## 30. Anatomia do Worker

```text
article
├── poster | video preview | placeholder
├── duration opcional
├── play affordance
├── title
├── provider
└── métricas opcionais
```

---

## 31. Variantes do Worker

### `portrait`

- Home;
- Resultados;
- feed visual.

### `compact`

- relacionados;
- rail secundário.

### `skeleton`

- mesma proporção da variante final.

### Regras

- proporção baseada em token, não altura fixa;
- poster obrigatório ou placeholder;
- autoplay sempre mudo;
- não iniciar áudio automaticamente;
- hover preview apenas quando houver `hover: hover`;
- foco de teclado não deve iniciar vídeo de forma surpreendente;
- `prefers-reduced-motion` desativa preview automático;
- carregamento de vídeo é lazy;
- erro de vídeo preserva poster.

---

## 32. Métricas de Worker

Quando `source.kind === 'demo_fixture'`:

- ocultar métricas ou identificá-las como demonstração no ambiente de protótipo;
- nunca misturar com contagens reais;
- não usar métricas demonstrativas para ranking;
- não persistir interação como se fosse remota.

---

# PARTE D — CARD DE PUBLICAÇÃO

## 33. PublicationCardData

```ts
type PublicationMedia =
  | { type: 'photo'; imageUrl: string | null }
  | { type: 'video'; posterUrl: string | null; videoUrl: string | null }
  | { type: 'before_after'; beforeUrl: string | null; afterUrl: string | null };

type PublicationCardData = {
  id: string;
  title: string;
  provider: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  media: PublicationMedia;
  metrics: {
    likes: number | null;
    comments: number | null;
    saves: number | null;
  };
  href: string;
  source: CardSource;
};
```

---

## 34. Anatomia da publicação

```text
article
├── media
│   ├── photo | video | before-after
│   ├── type badge
│   └── play/compare affordance quando aplicável
└── content
    ├── title
    ├── provider
    └── metrics opcionais
```

---

## 35. Tipos de mídia não são variantes de anatomia

```text
photo
video
before_after
```

são tipos de mídia dentro do mesmo card.

Não deverão gerar três componentes sem relação.

---

## 36. Variantes da publicação

### `standard`

- Home;
- Resultados;
- perfil.

### `compact`

- relacionados;
- rail secundário.

### `skeleton`

- mesma geometria final.

---

## 37. Interação da publicação

Se abre modal:

- usar botão real ou link real como acionador;
- `aria-haspopup="dialog"`;
- Enter e Espaço funcionam;
- retorno de foco ao fechar;
- card não deverá ser apenas `article role="button"` sem lifecycle completo;
- links internos para perfil não podem competir com o acionador global.

---

# PARTE E — SKELETON E ESTADOS

## 38. Contrato de skeleton

O contrato existente já determina que o skeleton reutilize a caixa final.

Este documento torna isso obrigatório por variante.

```text
service.standard.skeleton
service.compact.skeleton
professional.discovery.skeleton
worker.portrait.skeleton
publication.standard.skeleton
```

### Regras

- mesma largura;
- mesma proporção de mídia;
- mesma altura mínima estrutural;
- mesmos paddings principais;
- sem CTA interativo;
- `aria-hidden="true"` quando houver mensagem de status separada;
- animação removida em `prefers-reduced-motion`.

---

## 39. Estados internos do card

```text
loading
ready
refreshing
stale
error_media
error_action
disabled
```

### Não usar card vazio para erro de coleção

Erro de lista pertence à região.

Erro de imagem pertence ao card.

Erro de favorito pertence à ação.

---

# PARTE F — RESPONSIVIDADE E DENSIDADE

## 40. Regra de geometria

O card se adapta ao container.

A página informa apenas a largura disponível.

### Permitido

```css
grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--card-min)), 1fr));

aspect-ratio: var(--card-media-ratio);

min-block-size: var(--card-min-block-size);
```

### Proibido

```css
:nth-of-type(2) { height: 570.48px; }

width: 72.86px !important;

height: 603.92px !important;
```

---

## 41. Tokens de densidade

```text
--card-media-ratio
--card-padding
--card-gap
--card-title-lines
--card-title-size
--card-control-size
--card-min-inline-size
```

Cada variante altera tokens.

Ela não reescreve toda a anatomia.

---

## 42. Breakpoints de validação

- 320 px;
- 360 px;
- 390 px;
- 430 px;
- 560 px;
- 768 px;
- 900 px;
- 1024 px;
- 1180 px;
- 1280 px;
- 1440 px;
- 1920 px.

### Também validar

- zoom 200%;
- texto ampliado;
- modo retrato;
- modo paisagem;
- fonte ainda não carregada;
- scrollbar presente;
- rail com um item;
- rail com muitos itens.

---

# PARTE G — OWNERSHIP CSS

## 43. Estrutura futura recomendada

```text
assets/css/components/cards/
├── card-base.css
├── service-card.css
├── professional-card.css
├── worker-card.css
├── publication-card.css
├── card-density.css
└── card-skeleton.css
```

### Página

```text
assets/css/pages/*
```

pode importar, posicionar e compor.

Não pode redefinir internals.

---

## 44. Compatibilidade histórica

Durante migração:

```text
.doke-ad-card
.service-card
```

podem receber a mesma base.

Mas somente uma família deverá ser emitida por novos renderers.

### Meta final

```text
um DOM
uma nomenclatura
uma anatomia
uma suíte de testes
```

---

## 45. Política de `!important`

Nenhum handoff de card poderá adicionar `!important`.

Remoção de regras existentes será feita por ownership e ordem correta de importação.

Não por novo override.

---

# PARTE H — ACESSIBILIDADE

## 46. Requisitos gerais

- heading real dentro do card;
- ordem de leitura igual à ordem visual;
- foco visível;
- target de ação mínimo de 44 × 44;
- controles com nomes específicos;
- `aria-pressed` em favoritos;
- `aria-busy` em ação pendente;
- badge não depende só de cor;
- preço lido como texto completo;
- avaliação possui contexto;
- mídia decorativa usa `alt=""`;
- sem controles aninhados;
- sem `tabindex="0"` em card passivo;
- sem `role="button"` sem comportamento completo;
- reduced motion respeitado.

---

## 47. Ordem de tabulação

Card padrão:

```text
favorito
→ CTA
```

ou:

```text
link principal
→ favorito
```

conforme implementação escolhida.

Nunca incluir múltiplos links redundantes para o mesmo destino sem justificativa.

---

# PARTE I — MATRIZ CANÔNICA

## 48. Matriz de famílias

| Família | Autoridade atual candidata | Variantes permitidas | Origem possível |
|---|---|---|---|
| Anúncio | `Doke.publicServiceCard` | standard, compact, skeleton | canonical, personalized |
| Profissional | novo renderer canônico | discovery, compact, skeleton | canonical, editorial |
| Worker | novo renderer canônico | portrait, compact, skeleton | canonical, editorial, demo |
| Publicação | novo renderer canônico | standard, compact, skeleton | canonical, editorial, demo |

---

## 49. Slots por variante

### Anúncio

| Slot | Standard | Compact | Skeleton |
|---|---:|---:|---:|
| Mídia | sim | sim | placeholder |
| Badge | opcional | opcional | não |
| Favorito | opcional | opcional | não |
| Categoria | sim | sim | linha |
| Título | sim | sim | linhas |
| Profissional | sim | sim | linha/avatar |
| Avaliação | opcional | opcional | linha |
| Tags | até 2 | ocultáveis | linha |
| Localização | opcional | ocultável | linha |
| Preço | sim | sim | linha |
| CTA | sim | sim | bloco |

### Profissional

| Slot | Discovery | Compact | Skeleton |
|---|---:|---:|---:|
| Avatar | sim | sim | círculo |
| Nome | sim | sim | linha |
| Profissão | sim | sim | linha |
| Avaliação | opcional | opcional | linha |
| Verificação | opcional | opcional | não |
| Localização | opcional | ocultável | linha |
| CTA | sim | sim | bloco |

### Worker

| Slot | Portrait | Compact | Skeleton |
|---|---:|---:|---:|
| Poster | sim | sim | bloco |
| Play | sim | sim | não |
| Título | sim | sim | linhas |
| Provider | sim | sim | linha |
| Duração | opcional | opcional | linha |
| Métricas | opcionais | ocultáveis | não |

### Publicação

| Slot | Standard | Compact | Skeleton |
|---|---:|---:|---:|
| Mídia | sim | sim | bloco |
| Tipo | sim | sim | não |
| Título | sim | sim | linhas |
| Provider | sim | sim | linha |
| Métricas | opcionais | ocultáveis | não |

---

# PARTE J — QA

## 50. Matriz mínima de dados para anúncio

Testar:

1. preço fixo;
2. preço inicial;
3. orçamento;
4. gratuito explícito;
5. sem imagem;
6. imagem quebrada;
7. uma imagem;
8. título curto;
9. título longo;
10. categoria longa;
11. profissional com handle;
12. profissional sem handle;
13. profissional com avatar;
14. profissional sem avatar;
15. sem avaliação;
16. uma avaliação;
17. milhares de avaliações;
18. sem tags;
19. uma tag;
20. duas tags;
21. muitas tags;
22. sem localização;
23. localização longa;
24. sem badge;
25. cada badge permitido;
26. favorito desligado;
27. favorito ligado;
28. favorito pendente;
29. favorito com erro;
30. visitante sem sessão.

---

## 51. Matriz mínima de profissionais

- nome curto;
- nome longo;
- profissão curta;
- profissão longa;
- avatar real;
- iniciais;
- verificado;
- não verificado;
- sem avaliação;
- uma avaliação;
- localização ausente;
- localização longa;
- fonte canônica;
- fonte editorial;
- dados incompletos.

---

## 52. Matriz mínima de Workers

- poster válido;
- poster ausente;
- vídeo válido;
- vídeo ausente;
- vídeo falha;
- duração ausente;
- título longo;
- provider longo;
- métricas reais;
- métricas ocultas;
- origem demo;
- reduced motion;
- hover;
- touch;
- teclado;
- offline.

---

## 53. Matriz mínima de Publicações

- foto;
- vídeo;
- antes/depois;
- mídia ausente;
- título longo;
- provider longo;
- sem métricas;
- métricas reais;
- métricas demo;
- abertura de modal;
- retorno de foco;
- link de perfil;
- touch;
- teclado;
- offline.

---

## 54. Testes de invariantes

### DOM

- um renderer por família;
- nenhuma ação aninhada;
- heading presente;
- IDs estáveis;
- sem HTML duplicado de card nas páginas.

### CSS

- nenhuma dimensão por `nth-of-type`;
- nenhum decimal capturado por viewport;
- nenhum novo `!important`;
- página não altera anatomia;
- skeleton igual ao card final.

### Dados

- handle nunca fabricado;
- avatar nunca fabricado;
- badge nunca fabricado;
- preço consistente entre card e detalhe;
- avaliação consistente entre card e perfil;
- métricas demo não parecem reais.

### Interação

- favorito single-flight;
- favorito não navega;
- CTA abre item correto;
- modal retorna foco;
- preview respeita reduced motion;
- imagem quebrada não altera geometria.

---

# PARTE K — HANDOFFS FUTUROS

## 55. CARD-H01 — consolidação do renderer de anúncios

### Causa raiz

Três renderers interpretam a mesma entidade.

### Ação

- tornar `Doke.publicServiceCard.create` a única autoridade;
- adaptar Home, Resultados, Favoritos e relacionados;
- remover fallback estrutural de Resultados;
- retirar ou transformar `Doke.renderers.serviceCard` em adapter sem DOM próprio.

### Gate

Busca no repositório encontra apenas um construtor de anatomia de anúncio.

---

## 56. CARD-H02 — normalizador único de dados

### Ação

Criar normalização antes da renderização para:

- IDs;
- preço;
- identidade;
- avaliação;
- mídia;
- localização;
- badge;
- favorito;
- proveniência.

### Gate

Card e detalhe recebem o mesmo modelo normalizado.

---

## 57. CARD-H03 — ownership CSS

### Ação

- consolidar base e anatomia;
- reduzir famílias históricas;
- remover overrides anatômicos de página;
- remover dimensões exatas;
- remover `nth-of-type` geométrico;
- reduzir `!important` por ordem e ownership.

### Gate

A largura do card pode mudar sem patch por item.

---

## 58. CARD-H04 — renderer de profissional

### Ação

Criar `ProfessionalCardRenderer` com dados reais.

### Remover

- avatar escolhido por nome;
- avatar escolhido por profissão;
- HTML local de Resultados;
- divergência Home/Resultados.

---

## 59. CARD-H05 — renderer de Worker

### Ação

Separar:

- dados;
- card;
- preview;
- modal;
- estado de interação.

### Gate

O mesmo `WorkerCardData` alimenta Home, Resultados e modal.

---

## 60. CARD-H06 — renderer de Publicação

### Ação

Criar renderer único com `photo`, `video` e `before_after` como tipos de mídia.

### Gate

Home, Resultados e relacionados não copiam HTML.

---

## 61. CARD-H07 — skeleton por variante

### Ação

Criar fábrica ou markup canônico de skeleton para cada variante.

### Gate

Nenhum salto geométrico relevante entre skeleton e conteúdo.

---

## 62. CARD-H08 — suíte de auditoria

Criar checks para:

- renderers duplicados;
- controles aninhados;
- handles fabricados;
- avatares por nome;
- badges default;
- dimensões decimais exatas;
- `nth-of-type` geométrico;
- novos `!important`;
- anatomia em CSS de página;
- divergência de preço;
- ausência de origem dos dados.

---

## 63. CARD-H09 — testes de navegador

Cobrir:

- Home;
- Resultados;
- Favoritos;
- detalhe relacionados;
- perfil;
- mobile estreito;
- tablet;
- desktop;
- teclado;
- reduced motion;
- zoom 200%;
- mídia quebrada;
- dados longos.

---

# PARTE L — ORDEM DE IMPLEMENTAÇÃO

## 64. Sequência recomendada

```text
1. normalizador ServiceCardData
2. consolidação do renderer de anúncio
3. favoritos e navegação
4. CSS de anúncio
5. testes de anúncio
6. ProfessionalCardRenderer
7. WorkerCardRenderer
8. PublicationCardRenderer
9. skeletons
10. remoção de compatibilidade histórica
```

### Motivo

Anúncios possuem maior autoridade de negócio e já têm o componente mais próximo do estado canônico.

Workers e Publicações ainda misturam conteúdo editorial/demo e exigem contrato de origem antes de integração.

---

## 65. Gates antes de implementação

A implementação não deve começar nesta branch enquanto:

- a frente PAY estiver avançando na mesma base móvel;
- o PR UX estiver divergente ou não mergeável;
- não houver head lógico limpo para normalização;
- o escopo documental não estiver revisado;
- arquivos compartilhados estiverem sob alteração concorrente.

---

## 66. Critério de conclusão do UX-FOUNDATION-005

Este sublote está concluído quando:

- as famílias de card estão inventariadas;
- a autoridade candidata do anúncio está definida;
- variantes permitidas estão fechadas;
- variantes proibidas estão explícitas;
- schemas mínimos estão definidos;
- preço, avaliação, badge, mídia e favorito têm semântica única;
- acessibilidade está contratada;
- ownership CSS está definido;
- matriz de QA está pronta;
- handoffs futuros estão separados por causa raiz;
- nenhum runtime foi alterado.

---

## 67. Impacto esperado no site após implementação futura

A implementação futura deste contrato deverá produzir:

- anúncios visualmente consistentes na Home e em Resultados;
- favoritos sem piscar ou divergir;
- preços iguais em card e detalhe;
- perfis sem fotos ou usernames inventados;
- títulos longos sem quebrar o layout;
- cards relacionados responsivos sem alturas capturadas;
- skeletons com menos layout shift;
- Workers e Publicações com origem honesta;
- menos CSS corretivo;
- menos regressões por breakpoint;
- menor custo de manutenção;
- base segura para aplicação mobile futura.

---

## 68. Próximo sublote recomendado

```text
UX-FOUNDATION-006 — contrato de navegação, overlays e retorno de foco
```

Escopo previsto:

- card → detalhe;
- card → perfil;
- Worker → preview;
- Publicação → modal;
- favoritos;
- drawers;
- overlays;
- histórico;
- deep links;
- fechamento;
- retorno de foco;
- scroll restoration;
- navegação via stable shell.
