# Stage 61B — Data Contracts and Normalizers

## Objetivo

Definir contratos mínimos de dados e normalizadores para preparar o frontend Doke para dados dinâmicos sem alterar visual, HTML, CSS ou comportamento runtime atual.

## Fluxo recomendado

```txt
service/api/mock -> repository -> normalizer -> controller -> renderer -> DOM
```

## Responsabilidades

- `assets/js/contracts/`: descreve o formato mínimo esperado por entidade.
- `assets/js/adapters/`: converte dados crus de mock/API/Supabase/Firebase para o formato aceito pelo frontend.
- Controllers continuam recebendo dependências por parâmetro.
- Renderers continuam puros: recebem root/data/state e não buscam dados.

## Regra arquitetural

Nenhuma página deve consumir payload cru de backend diretamente. Antes de chegar ao renderer, os dados devem passar por repository e normalizer.

## Escopo preservado

Esta stage não conecta módulos aos HTMLs, não altera CSS, não toca em shell/router/header/sidebar e não implementa backend real.
