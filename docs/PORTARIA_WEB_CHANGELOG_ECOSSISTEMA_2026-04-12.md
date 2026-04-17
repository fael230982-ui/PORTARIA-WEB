# Changelog Do Ecossistema - Portaria Web

Data de criacao: `2026-04-12`
Origem: `Portaria Web`

## Entradas

### 2026-04-13 | Portaria Web | Sessao do morador e textos do portal alinhados ao contrato atual | frontend

- `mudanca`: o `Portaria Web` passou a expor melhor o contexto de sessao do morador no perfil, incluindo `scopeType`, obrigatoriedade de selecao de unidade e contagem de unidades disponiveis, alem de limpar textos antigos de `V4.3` e `V4.4` no portal do morador e em `Encomendas`.
- `impacta contrato`: sim, porque reforca o peso de `scopeType`, `selectedUnitId`, `selectedUnitName` e `requiresUnitSelection` como dependencias reais do ecossistema, mesmo antes da arbitragem final do backend.
- `quem precisa agir`: `Backend` deve fechar o contrato final de escopo de sessao; `App Morador` e `Guarita` podem manter a mesma leitura semantica quando aplicavel.
- `documento base`: `APP_MORADOR_PARECER_CONSOLIDADO_POS_V4_5_2026-04-13.md`, `PORTARIA_WEB_PENDENCIAS_BACKEND_POS_API_V4_5_2026-04-13.md`

### 2026-04-13 | Portaria Web | Dashboard do morador absorve notificacoes ricas da V4.5 | frontend

- `mudanca`: o `Portaria Web` passou a tipar e exibir melhor `resident notifications` com `domain`, ids de contexto, `snapshotUrl`, `replayUrl` e acao de `marcar todas como lidas` quando a API disponibiliza esse fluxo.
- `impacta contrato`: sim, porque reforca a convergencia entre `resident notifications`, evidencia visual e roteamento por dominio, mas ainda depende de arbitragem final do `Backend` para push, preferencias remotas e governanca de replay.
- `quem precisa agir`: `Backend` deve fechar o contrato final de notificacoes e push; `App Morador` e `Guarita` podem manter a mesma leitura semantica por dominio.
- `documento base`: `APP_MORADOR_API_V4_5_INTEGRATION_2026-04-13.md`, `APP_MORADOR_PARECER_CONSOLIDADO_POS_V4_5_2026-04-13.md`, `PORTARIA_WEB_PENDENCIAS_BACKEND_POS_API_V4_5_2026-04-13.md`

### 2026-04-13 | Portaria Web | Stream operacional enriquecido na leitura local | compatibilidade

- `mudanca`: o `Portaria Web` passou a absorver no stream os campos ricos da `V4.5`, incluindo `eventType`, `entityType`, `cameraId` e `condominiumId`, mantendo leitura defensiva para `type` e `timestamp` enquanto o backend nao fecha o canonico final.
- `impacta contrato`: sim, porque explicita que o frontend segue em compatibilidade temporaria enquanto `type/eventType` e `timestamp/occurredAt` coexistirem.
- `quem precisa agir`: `Backend` deve arbitrar o canonico final do stream; `Guarita` e `App Morador` podem manter a mesma leitura de transicao.
- `documento base`: `APP_MORADOR_PENDENCIAS_BACKEND_POS_API_V4_5_2026-04-13.md`, `GUARITA_PENDENCIAS_BACKEND_ECOSSISTEMA_2026-04-13.md`

### 2026-04-13 | Portaria Web | API Sapinho V4.5 em encomendas | api

- `mudanca`: o `Portaria Web` passou a usar `POST /api/v1/deliveries/{id}/renotify` como fluxo oficial de reenvio de notificacao de encomenda, com fallback compatível para ambientes ainda anteriores.
- `impacta contrato`: sim, porque reduz o uso semantico de mudanca de status como substituto de renotificacao e passa a depender de estabilizacao do endpoint novo em todos os ambientes.
- `quem precisa agir`: `Backend` deve manter `renotify` estavel; `Guarita` e `App Morador` podem alinhar a governanca de `deliveryRenotification` e nomenclatura de destinatario.
- `documento base`: `PORTARIA_WEB_RESUMO_INTEGRACAO_API_SAPINHO_V4_5_2026-04-13.md`, `PORTARIA_WEB_PEDIDO_BACKEND_V4_5_GAP_2026-04-13.md`, `APP_MORADOR_API_V4_5_INTEGRATION_2026-04-13.md`

### 2026-04-12 | Portaria Web | Minimização operacional reforçada em superfícies rápidas | governanca

- `mudanca`: o `Portaria Web` ampliou o mascaramento em cards, listas e tabelas administrativas de `moradores`, `usuarios`, `unidades` e `operacao`, e deixou `codigo de retirada` apenas parcial no detalhe administrativo de encomenda.
- `impacta contrato`: sim, porque reforca a necessidade de regra compartilhada de exibicao por perfil para `contato`, `documento` e `credenciais de retirada`.
- `quem precisa agir`: `Backend`, `Portaria Web`, `App Morador` e `Guarita` devem manter a mesma linha de minimizacao operacional.
- `documento base`: `GUARITA_CHANGELOG_ECOSSISTEMA_2026-04-12.md`, `GUARITA_LGPD_AUDITORIA_INICIAL_2026-04-12.md`, `PORTARIA_WEB_HOMOLOGACAO_LGPD_2026-04-12.md`

### 2026-04-12 | Portaria Web | Primeira rodada LGPD no frontend | governanca

- `mudanca`: o `Portaria Web` publicou `Termo de Uso`, `Politica de Privacidade`, fluxo de primeiro acesso com aceite versionado local e backlog inicial de conformidade.
- `impacta contrato`: sim, porque o fechamento completo ainda depende de persistencia de aceite no `backend`, base legal por fluxo e politica compartilhada de retencao.
- `quem precisa agir`: `Portaria Web`, `Backend`, `App Morador`, `Guarita` e responsavel juridico/operacional.
- `documento base`: `PORTARIA_WEB_LGPD_REQUISITOS_ECOSSISTEMA_2026-04-12.md`, `PORTARIA_WEB_BACKLOG_LGPD_2026-04-12.md`

### 2026-04-12 | Portaria Web | Mascaramento prudente de dados pessoais | compatibilidade

- `mudanca`: o `Portaria Web` passou a mascarar parcialmente `documento`, `telefone` e `e-mail` em telas de leitura rapida e resumo operacional onde o dado completo nao e essencial.
- `impacta contrato`: sim, porque reforca a necessidade de uma regra compartilhada de exibicao completa versus exibicao parcial por perfil.
- `quem precisa agir`: `Backend`, `Portaria Web`, `App Morador` e `Guarita`.
- `documento base`: `APP_MORADOR_LGPD_AUDITORIA_APP_MORADOR_2026-04-12.md`, `APP_MORADOR_LGPD_PENDENCIAS_EXTERNAS_2026-04-12.md`

### 2026-04-12 | Portaria Web | Permissoes canonicas locais | compatibilidade

- `mudanca`: o `Portaria Web` passou a centralizar a normalizacao de permissoes e aliases em uma camada unica, aplicada em sessao e na tela de usuarios.
- `impacta contrato`: sim, porque reduz divergencia local enquanto o formato canonico oficial ainda nao foi fechado.
- `quem precisa agir`: `Backend`, `Guarita` e `App Morador` devem convergir para a mesma decisao oficial de permissao por acao.
- `documento base`: `APP_MORADOR_DECISOES_PENDENTES_DO_ECOSSISTEMA_2026-04-12.md`, `GUARITA_DIVERGENCIAS_ECOSSISTEMA_2026-04-12.md`

### 2026-04-12 | Portaria Web | Alertas e cameras com leitura canonica local | compatibilidade

- `mudanca`: o `Portaria Web` passou a usar helper canonico para evidencia de alerta e disponibilidade de midia de camera, reduzindo fallback espalhado.
- `impacta contrato`: sim, porque reforca a necessidade de um shape oficial para `alertType`, `alertSeverity`, `alertStatus`, `cameraId` e `snapshotUrl`.
- `quem precisa agir`: `Backend` precisa fechar o contrato oficial; `Guarita` e `App Morador` devem manter a mesma leitura semantica.
- `documento base`: `APP_MORADOR_DECISOES_PENDENTES_DO_ECOSSISTEMA_2026-04-12.md`, `PORTARIA_WEB_PEDIDO_BACKEND_V4_4_GAP_2026-04-12.md`

### 2026-04-12 | Portaria Web | Busca oficial de unidades na operacao | frontend

- `mudanca`: a tela de operacao passou a usar `GET /api/v1/operation/units` como busca oficial de unidades, com fallback para catalogo local.
- `impacta contrato`: sim, porque depende de schema estavel para consolidacao total do fluxo operacional.
- `quem precisa agir`: `Backend` deve estabilizar o contrato; `Guarita` pode validar a mesma rota em fluxo operacional equivalente.
- `documento base`: `resumo-integracao-api-sapinho-v4-4-2026-04-12.md`, `pedido-backend-v4-4-gap-2026-04-12.md`

### 2026-04-12 | Portaria Web | Correcao documental e copia compartilhada | governanca

- `mudanca`: foi corrigido um problema de encoding no documento compartilhado de pendencias do backend e mantida a copia oficial na raiz de `DES-RAFIELS` com prefixo do modulo.
- `impacta contrato`: nao diretamente, mas melhora a governanca e reduz ruido entre os times.
- `quem precisa agir`: todos os modulos devem manter o padrao novo de publicacao na raiz com prefixo.
- `documento base`: `APP_MORADOR_CHANGELOG_ECOSSISTEMA_2026-04-12.md`, `APP_MORADOR_CHECKLIST_HOMOLOGACAO_CRUZADA_ECOSSISTEMA_2026-04-12.md`
