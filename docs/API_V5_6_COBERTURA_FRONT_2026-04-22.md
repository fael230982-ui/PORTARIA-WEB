# Cobertura da API Sapinho V5.6 no Portaria Web

Data da revisao: 2026-04-22

Fonte analisada: `src/api/API Sapinho V5.6.txt`

Observacao sobre a versao: a V5.6 nao adicionou nem removeu rotas em relacao a V5.5. A mudanca identificada foi o acrescimo dos schemas `PublicOperationalHttpMetricsResponse` e `PublicOperationalHttpRouteMetricsResponse` para metricas operacionais.

## Resultado geral

A integracao da V5.6 esta avancada, mas ainda nao esta 100% concluida no front.

Para fechar 100%, os endpoints foram separados em tres grupos:

- **Implementado**: ja existe chamada no front e tela/fluxo usando o recurso.
- **Parcial**: existe chamada ou tela, mas falta completar fluxo, tratamento visual ou homologacao.
- **Nao se aplica como tela**: endpoint tecnico, webhook, monitoramento, notificacao de equipamento ou integracao interna. Deve existir no backend, mas nao precisa aparecer para o usuario final.

## Implementado ou praticamente pronto

| Area | Endpoints principais | Status |
| --- | --- | --- |
| Autenticacao | `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password` | Implementado |
| Permissoes | `GET /auth/permissions-matrix`, `GET /auth/sync-capabilities`, `GET /auth/stream-capabilities` | Implementado |
| Master - clientes | `GET/POST /master/clients`, `GET/PATCH /master/clients/{client_id}` | Implementado |
| Master - modulos | `GET /master/modules/catalog`, `PATCH /master/clients/{client_id}/modules` | Implementado |
| Master - licenca por cliente | `PATCH /master/licenses/{client_id}` | Implementado |
| Master - resumo | `GET /master/summary` | Implementado |
| Master - dispositivos operacionais | `GET /master/operation-devices` | Implementado |
| Condominios | `GET/POST /condominiums`, `PATCH /condominiums/{id}` | Parcial |
| Ruas/unidades | `GET/POST /streets`, `GET/POST/PATCH /units` | Parcial |
| Pessoas | `GET/POST /people`, `GET/PUT /people/{id}`, `GET /people/by-cpf`, `PATCH /people/{id}/status` | Implementado |
| Foto de pessoas | `POST /people/photo/upload`, captura por webcam e captura por camera | Implementado |
| OCR de documento | `POST /people/document-ocr` | Parcial |
| Resumo de acesso | `GET /people/{id}/access-summary` | Implementado |
| Cameras | `GET/POST /cameras`, `GET/PATCH/DELETE /cameras/{id}`, `POST /cameras/async` | Implementado |
| Camera online/offline | `PATCH /cameras/{id}/status` | Implementado, mas o ideal e status automatico pelo backend |
| Midia de camera | `GET /cameras/{id}/snapshot`, `/streaming`, `/image-stream`, `POST /capture-photo` | Parcial |
| Replays de camera | `GET/POST /cameras/{id}/replays`, `GET /cameras/{camera_id}/replays/{replay_id}` | Parcial |
| Encomendas | `GET/POST /deliveries`, `PATCH /deliveries/{id}/status` | Implementado |
| Encomendas - retirada | `POST /deliveries/{id}/validate-withdrawal`, `GET /deliveries/withdrawal-qr/{code}` | Implementado |
| Encomendas - foto/OCR | `POST /deliveries/photo/upload`, `/ocr`, `/ocr-label` | Implementado |
| Aviso de encomenda | `POST /deliveries/{id}/renotify` | Implementado |
| Alertas | `GET /alerts`, `GET /alerts/{id}`, `PATCH /alerts/{id}/status`, `PATCH /alerts/{id}/workflow` | Implementado |
| Acessos | `GET /access-logs`, `GET /access-logs/{id}` | Implementado |
| Acionamentos | `GET /actions`, `POST /actions/{action_id}/execute` | Implementado |
| Mensagens | `GET/POST /messages`, `PATCH /messages/{id}/read` | Implementado |
| WhatsApp QR | `GET /messages/whatsapp/connection`, `POST /messages/whatsapp/connect` | Implementado |
| Operacao - busca | `GET /operation/search`, `GET /operation/units` | Implementado |
| Operacao - busca facial | `POST /operation/people/search-by-photo`, `GET /operation/people/search-by-photo/audit` | Implementado |
| Turno | `POST /operation/shift-change`, `GET /operation/shift-changes` | Parcial |
| Heartbeat operacional | `POST /operation/devices/heartbeat` | Implementado |
| Morador - perfil | `GET/PUT /resident/profile` | Parcial |
| Morador - encomendas | `GET /resident/deliveries` | Implementado |
| Morador - notificacoes | `GET /resident/notifications`, `PATCH /resident/notifications/{id}/read`, `PATCH /resident/notifications/read-all` | Implementado |
| Morador - preferencias | `GET/PUT /resident/notification-preferences` | Implementado |
| Morador - LGPD | `GET /resident/lgpd-policy`, `GET/PUT /resident/lgpd-consent`, `GET /resident/lgpd-consent/history` | Implementado |
| Veiculos | `GET/POST /vehicles`, `GET/PUT/DELETE /vehicles/{id}` | Implementado |
| Jobs | `GET /jobs`, `GET /jobs/{id}` | Implementado |
| Sincronizacao interna | `GET /internal/sync/reconcile/{client_request_id}` | Implementado como suporte |

## Falta implementar para fechar 100% do front

### 1. Recuperacao de senha publica

Endpoints:

- `POST /auth/forgot-password`
- `POST /auth/reset-password`

Status:

- Implementado no login em 2026-04-22.
- Falta apenas homologar com e-mail real do backend e validar o formato final do link enviado ao usuario.

Prioridade: alta.

### 2. Administracao de grupos de acesso

Endpoints:

- `GET/POST /access-groups`
- `GET/PUT/DELETE /access-groups/{id}`

Falta:

- Tela para criar grupos como morador, visitante, prestador, funcionario, admin, operador ou grupos personalizados.
- Vinculo visual com pessoas, dispositivos e regras de acesso.

Prioridade: alta.

### 3. Dispositivos fisicos e Control-ID

Endpoints:

- `GET/POST /devices`
- `GET/PUT /devices/{id}`
- `POST /devices/{id}/control-id/test-connection`
- `POST /devices/{id}/control-id/configure-push`
- `POST /devices/{id}/control-id/configure-monitor`
- `POST /devices/{id}/control-id/enable-online`
- `POST /devices/{id}/control-id/disable-online`
- `POST /devices/{id}/control-id/remote-open`
- `POST /devices/{id}/control-id/people/{person_id}/sync`

Falta:

- Tela de configuracao de equipamentos.
- Botoes de teste, configurar monitoramento, habilitar/desabilitar online, abertura remota e sincronizar pessoa.
- Padronizar onde ficam "ramais", "comandos fisicos" e "acoes imediatas".

Prioridade: muito alta, porque o usuario ja perguntou onde configurar acionamentos e comandos fisicos.

### 4. Estrutura completa do empreendimento

Endpoints:

- `GET/POST /blocks`
- `GET/POST /quads`
- `GET/POST /lots`

Falta:

- Tela/fluxo para configurar blocos, quadras e lotes diretamente.
- Hoje parte disso foi adaptada usando ruas/unidades, mas a V5.6 tem endpoints especificos.

Prioridade: media.

### 5. Eventos em tempo real

Endpoints:

- `GET /events/stream`
- `POST /events/stream/confirm`

Falta:

- Ativar o consumo real do stream na Operacao.
- Confirmar eventos recebidos.
- Atualizar cameras, alertas, acessos, mensagens e encomendas sem depender apenas de recarregar a tela.

Prioridade: alta.

Observacao: precisa confirmar no backend se o stream aceita token por cookie, query string ou outro mecanismo, porque `EventSource` nativo nao envia header `Authorization`.

### 6. Importacao CSV

Endpoint:

- `POST /imports/csv`

Falta:

- Tela de importacao em massa para moradores, unidades, veiculos ou outro tipo aceito pelo backend.
- Validacao antes do envio e resumo de erros amigavel.

Prioridade: media.

### 7. OCR generico

Endpoints:

- `POST /ocr`
- `POST /ocr/document`
- `POST /ocr/text`

Falta:

- Unificar OCR generico com cadastro de pessoas, visitantes, prestadores e encomendas.
- Hoje existem OCRs especificos ja usados em pessoas/encomendas.

Prioridade: media.

### 8. Operacao Master por cliente

Endpoint:

- `PATCH /master/clients/{client_id}/operation`

Falta:

- Tela para ligar/desligar operacao, configurar estado operacional e visibilidade por cliente.

Prioridade: media.

### 9. Licencas - listagem geral

Endpoint:

- `GET /master/licenses`

Falta:

- Tela/lista consolidada de licencas, vencimentos, mensalidades e status.
- Hoje a edicao por cliente ja existe.

Prioridade: alta para o Master.

### 10. Previsoes de visita completas

Endpoints:

- `GET/POST /visit-forecasts`
- `GET/PATCH /visit-forecasts/{id}`
- `PATCH /visit-forecasts/{id}/status`

Falta:

- Tela completa para morador criar, editar e cancelar previsao.
- Tela operacional/admin para consultar e alterar status.

Prioridade: alta.

### 11. Recursos de seguranca do morador

Endpoints:

- `POST /resident/panic/start`
- `PATCH /resident/panic/{id}/location`
- `POST /resident/panic/{id}/stop`
- `POST /resident/arrival-monitoring/start`
- `GET /resident/arrival-monitoring/geo-fence`
- `PATCH /resident/arrival-monitoring/{id}/location`
- `POST /resident/arrival-monitoring/{id}/stop`
- `GET /resident/live-incidents`
- `GET /resident/live-incidents/active`
- `GET /resident/live-incidents/history`
- `GET /resident/people/by-cpf`
- `POST /resident/devices`

Falta:

- Tela/fluxo de panico no web morador, se for permitido usar pelo navegador.
- Monitoramento de chegada.
- Historico de ocorrencias ao vivo.
- Cadastro de dispositivo do morador no navegador.

Prioridade: baixa a media no web, alta no app morador.

### 12. Acesso remoto

Endpoints:

- `GET /remote-access/devices`
- `POST /remote-access/devices/{id}/open`

Falta:

- Tela de dispositivos remotos permitidos.
- Botao de abertura com confirmacao clara.
- Registro visual do resultado.

Prioridade: alta se o web for usado como operacao.

## Endpoints tecnicos que nao devem virar tela comum

Estes endpoints devem ser mantidos como integracao tecnica do backend, equipamentos, monitoramento ou webhooks. O front pode consumir alguns como apoio, mas nao deve expor todos para usuario final.

| Grupo | Endpoints |
| --- | --- |
| Webhook WhatsApp | `POST /messages/whatsapp/webhook/{instance}` |
| Webhooks Control-ID | `POST /api/notifications/*`, `/device_is_alive.fcgi`, `/new_card.fcgi`, `/new_user_id_and_password.fcgi`, `/new_user_identified.fcgi`, `/result` |
| Integracoes faciais de evento | `/integrations/face/*/events`, `/facial/event` |
| Integracao VMS | `POST /integrations/vms/generic-alarm` |
| Monitoramento tecnico | `GET /ops/metrics`, `GET /ops/metrics/prometheus`, `/health`, `/health/live`, `/health/ready` |
| Sincronizacao interna | `POST /internal/sync/events` |
| Motor facial/Max Robot tecnico | `/integrations/face/max-robot/*`, exceto quando usado por uma tela especifica de configuracao |

## Ordem recomendada para chegar a 100%

1. Recuperacao de senha.
2. Dispositivos fisicos, Control-ID, ramais e comandos fisicos.
3. Grupos de acesso.
4. Licencas Master em lista consolidada.
5. Previsoes de visita completas.
6. Eventos em tempo real.
7. Estrutura completa com blocos, quadras e lotes.
8. Importacao CSV.
9. OCR generico.
10. Recursos de seguranca do morador, avaliando o que fica no web e o que fica no app.

## Bloqueios e pontos para confirmar com backend

- `GET /users` ja esta integrado, mas retornou erro `500` em testes recentes. Sem isso, o front nao consegue listar/editar administradores existentes com confianca.
- Camera ao vivo depende do backend publicar `liveUrl`, `hlsUrl`, `webRtcUrl` ou `imageStreamUrl` funcional em `/cameras/{id}/streaming`. RTSP puro nao toca no navegador.
- Eventos em tempo real precisam de regra de autenticacao compativel com navegador.
- Endpoints de panico e monitoramento de chegada dependem de permissao de geolocalizacao do navegador e validacao de produto.
