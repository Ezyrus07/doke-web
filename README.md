# Doke Web

Doke é uma plataforma web em evolução para conectar pessoas, profissionais, serviços, conteúdo e comunidade. Este repositório mantém a versão frontend estática atual, preparada para futura integração com dados reais, autenticação, pagamentos, mensagens e backend.

## Fonte de verdade para agentes

Antes de qualquer alteração estrutural, leia:

- `AGENTS.md`
- `PROJECT-RULES.md`
- `docs/DOKE_AGENT_CONSTITUTION.md`
- `docs/ARCHITECTURE.md`
- `docs/CSS_AUTHORITY_MAP.md`
- `docs/ACTIVE-CONTRACTS-INDEX.md`
- `docs/VALIDATION.md`

## Estrutura principal

```txt
assets/css/core/        tokens, reset, tipografia, base e utilitários globais
assets/css/components/  componentes reutilizáveis
assets/css/patterns/    composições reutilizáveis, rails, feeds e listas
assets/css/pages/       contratos específicos de página
assets/js/core/         roteador, boot, sessão e infraestrutura frontend
assets/js/services/     fronteira de dados e repositórios
assets/js/controllers/  orquestração de página
assets/js/renderers/    renderização DOM a partir de dados
assets/js/pages/        comportamento específico de páginas
backend/                estrutura-alvo para domínio/API futura
docs/                   contratos vivos, governança e validação
```

## Regras essenciais

- Não criar remendos locais para problemas de arquitetura.
- Não duplicar contratos de shell, header, sidebar, cards ou rails.
- Não adicionar `!important` como solução padrão.
- Não criar CSS novo sem provar que a responsabilidade não pertence a arquivo existente.
- Não alterar baseline visual aprovado sem autorização explícita.
- Não apagar arquivos de shell, navigation, header, router, home, mensagens ou detalhe-anuncio sem validação visual.

## Auditorias úteis

```bash
npm run audit:docs-report-hygiene
npm run audit:duplicate-assets
npm run audit:unused-asset-candidates
npm run audit:important-reduction-plan
npm run audit:frontend
npm run audit:page-asset-budget
```

## Validação visual mínima

Quando mexer em shell, header, rail/largura, scroll, roteador, CSS global ou links CSS de várias páginas, validar pelo menos:

```txt
Desktop: 1366x768
Tablet: 820x1180
Mobile: 390x844

index.html
perfil.html
pedidos.html
mensagens.html
notificacoes.html
comunidade.html
resultados.html
detalhe-anuncio.html
ajuda.html
```
