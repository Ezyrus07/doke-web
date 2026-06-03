# Organização aplicada

## Base ativa
- `assets/css/core/`
- `assets/css/pages/`
- `assets/js/core/`
- `assets/js/pages/`

## O que saiu
- duplicatas antigas na raiz de `assets/css/`
- duplicatas antigas na raiz de `assets/js/`
- `profilefix/`
- `assets/css/legacy/`
- `assets/js/legacy/`
- folhas CSS órfãs em `assets/css/pages/` sem referência ativa

## Exceções preservadas
- `assets/js/core/auth.js` continua como camada de compatibilidade
- `assets/js/core/supabase-config.example.js` continua como exemplo de configuração

## Próximo passo recomendado
- consolidar padrões reais da interface em cima da base ativa já reduzida
