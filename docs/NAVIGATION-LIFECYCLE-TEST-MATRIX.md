# Matriz de testes — Navigation and Transition System

Status nesta entrega: **matriz criada; execução visual não realizada**.

| Cenário | Entrada | Estado esperado | Loading esperado | Destino | Status |
|---|---|---|---|---|---|
| F5 na verificação | reload | shell estável, conteúdo protegido oculto | boot condicional → skeleton | mesma rota | não executado |
| URL direta na verificação | address bar | shell + skeleton no primeiro frame útil | sem página vazia | mesma rota | não executado |
| Clique interno em Anunciar, cliente | app shell | guard pending visível | sem splash; skeleton no destino | verificação/tornar profissional conforme política | não executado |
| Clique interno em Anunciar, profissional ativo | app shell | formulário permitido | transição de conteúdo | anunciar serviço | não executado |
| Verificação pendente | guard | conteúdo de status | skeleton estrutural curto | verificação | não executado |
| Verificação rejeitada | guard | status + ação de correção | skeleton estrutural curto | verificação | não executado |
| Sessão ausente | guard | nenhuma superfície privada | pending → redirect replace | login | não executado |
| Repository falha | qualquer | erro recuperável | skeleton → error | rota atual segura | não executado |
| IndexedDB indisponível | qualquer | fallback/erro explícito | sem loop infinito | rota segura | não executado |
| Dados rápidos | hard/internal | sem flash de skeleton tardio | direct ou anti-flash central | rota alvo | não executado |
| Dados lentos | hard/internal | shell preservado | skeleton contínuo | rota alvo | não executado |
| Back | browser | rota e scroll restaurados | sem splash | rota anterior | não executado |
| Forward | browser | rota e scroll restaurados | sem splash | rota seguinte | não executado |
| Mobile 390×844 | todos | header/bottom nav estáveis | skeleton responsivo | rota alvo | não executado |
| Tablet 608×926 | todos | rail/shell estáveis | skeleton responsivo | rota alvo | não executado |
| Desktop 1366×768 | todos | largura/scroll estáveis | skeleton responsivo | rota alvo | não executado |
| Reduced motion | todos | nenhuma animação essencial | crossfade/shimmer removidos | rota alvo | não executado |

## Ambientes obrigatórios nas etapas de migração

- 1366×768, 1280×800, 1024×768, 820×1180, 608×926 e 390×844;
- rede normal, Slow 4G e Fast 3G quando disponível;
- CPU 4× slowdown;
- Chrome desktop e viewport mobile;
- navegação por mouse, teclado, back e forward.
