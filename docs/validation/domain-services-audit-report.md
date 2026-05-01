# Domain Services Audit Report

Status esperado: `Domain services audit passed.`

Verificações:

- arquivos de serviço existem;
- cada serviço expõe o namespace correto em `Doke.services`;
- `domain-data-service.js` expõe `Doke.domainData.loadPageData`;
- `controller-data.js` usa a camada de domínio antes do fallback bruto para mocks;
- as 10 páginas principais carregam os scripts na ordem correta.
