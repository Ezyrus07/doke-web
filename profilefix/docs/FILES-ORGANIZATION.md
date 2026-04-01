# Organização aplicada nesta etapa

## Objetivo
Reduzir ambiguidade de manutenção e preparar o projeto para crescer sem continuar espalhando CSS e JS duplicados.

## O que ficou ativo
A base ativa continua concentrada em:
- `assets/css/core/`
- `assets/css/pages/`
- `assets/js/core/`
- `assets/js/pages/`

## O que foi arquivado
Arquivos legados que estavam duplicados na raiz de `assets/css/` e `assets/js/` foram movidos para:
- `assets/css/legacy/`
- `assets/js/legacy/`

Esses arquivos não eram a fonte oficial carregada pelos HTMLs atuais.

## Benefícios
- menos risco de editar o arquivo errado;
- leitura mais clara do projeto;
- manutenção futura mais previsível;
- base preparada para continuar padronizando páginas novas.

## Exceções importantes
- `assets/js/core/auth.js` foi criado como shim de compatibilidade para páginas que já apontavam para esse caminho.
- As páginas continuam importando os mesmos caminhos ativos para evitar quebra de navegação.

## Próximo passo recomendado
Consolidar includes repetidos do shell em um template/base parcial ou em um build step, para reduzir repetição entre HTMLs internos.
