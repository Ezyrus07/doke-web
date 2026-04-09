# Site organization actionable audit

## Diagnóstico executivo
A base atual já tem alguma organização, mas ainda está orientada demais a tela e pouco a sistema. O maior risco imediato não é performance para tráfego massivo, e sim custo de manutenção ao adicionar lógica real.

## Riscos prioritários

### 1. CSS monolítico
Arquivos com responsabilidade excessiva:
- `assets/css/pages/home-refresh.css`
- `assets/css/pages/home-sections.css`
- `assets/css/pages/detalhe-anuncio.css`
- `assets/css/pages/pedidos.css`

### 2. Acoplamento entre páginas
Páginas internas ainda podem depender de manifests e estilos do ecossistema da home.

### 3. JS por página muito concentrado
Scripts ainda misturam mock, renderização e comportamento da interface.

### 4. Base de perfil ainda precisa consolidar ownership
A feature de perfil não pode continuar espalhada em múltiplos scripts sem contrato claro.

## Ações já iniciadas nesta rodada
- criação das pastas de arquitetura futura em `assets/css/components/`
- criação das pastas `assets/js/features/`, `services/`, `staté/`, `utils/`
- criação de `assets/data/mocks/`
- criação de script de auditoria estrutural complementar
- criação deste plano executável de refatoração

## Ação recomendada imediata
1. travar padrão do shell
2. travar tabs e cards compartilhados
3. revisar mobile system junto da componentização
4. começar a retirar responsabilidade de `home-refresh.css`
5. consolidar perfil como primeira feature oficial
