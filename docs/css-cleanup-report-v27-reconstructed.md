# v27 reconstruído — acabamento visual/UX

Este pacote reconstrói os arquivos declarados no patch v27 que não estavam mais disponíveis fisicamente no ambiente.

Inclui:
- limpeza de seleção em pedidos/notificações;
- limite de sobra/rolagem no perfil;
- ajuste visual do modal de orçamento;
- densidade de cards no resultado;
- preview de vídeo para Workers no hover/foco;
- vídeo de exemplo `assets/media/workers/worker-demo.mp4`.

Observação: por segurança, os arquivos foram entregues como módulos isolados. Garanta que os manifests/HTMLs do projeto importem os novos CSS/JS quando necessário.
