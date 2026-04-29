# PORTARIA WEB - PENDENCIAS BACKEND ATIVAS - 2026-04-28

Atualizado em 2026-04-29 apos devolutiva do backend.

## Pendencias ativas

1. Confirmacao fisica do acionamento Control iD

- o retorno atual de `POST /api/v1/devices/{id}/control-id/remote-open` confirma apenas fila:
  - `ok: true`
  - `operation: remote_open`
  - `result.queued: true`
  - `result.deviceResult.queued: true`
  - `jobId`
- o front ja trata esse caso como "Aguardando confirmacao", nao como abertura fisica confirmada
- para mostrar verde como abertura confirmada, falta retorno final com algo equivalente a:
  - `queued: false`
  - `executed: true`
  - `confirmed: true`
  - `finalStatus: SUCCEEDED`
  - `deviceHttpStatus`
  - `deviceMessage`
- se o fluxo continuar assincrono, precisa existir endpoint de consulta do job, por exemplo:
  - `GET /api/v1/devices/{device_id}/control-id/jobs/{job_id}`
- atualizacao 2026-04-29: o endpoint de job foi publicado e integrado no front, mas o teste real continuou pendente:
  - device: `9d850831-c5fb-4c8c-b9e4-889131c3b459`
  - job: `137583a2-e4a9-4209-9cc4-345acba3b540`
  - `result.status: PENDING`
  - `result.finalStatus: PENDING`
  - `result.queued: true`
  - `result.executed: false`
  - `result.confirmed: false`
  - `result.deviceHttpStatus: null`
  - `result.deviceMessage: "Comando aguardando consumo pelo Control iD"`
- conclusao: o front ja consulta o job, mas o backend ainda nao esta recebendo/registrando a execucao fisica do Control iD nesse fluxo

2. Estado fisico da porta aberta/fechada

- o OpenAPI possui callback:
  - `POST /api/notifications/door`
- tambem possui configuracao online/monitor:
  - `POST /api/v1/devices/{id}/control-id/configure-monitor`
  - `POST /api/v1/devices/{id}/control-id/configure-push`
- mas ainda falta contrato publico para o front ler o ultimo estado persistido da porta
- sugestao de contrato:
  - `doorStatus: OPEN | CLOSED | UNKNOWN`
  - `doorLastEventAt`
  - `doorNumber`
  - `doorStateSource`
  - ou endpoint `GET /api/v1/devices/{id}/control-id/door-status`

3. Fechamento final do fluxo VMS Incoresoft

- cadastro final da camera local ainda precisa ser validado de ponta a ponta no ambiente atual
- especialmente:
  - reaproveitamento de camera existente no VMS
  - fallback quando a lista vier vazia
  - exclusao completa de camera vinculada

## Resolvido e retirado da lista

- `PATCH /api/v1/devices/{id}` para edicao de `Device`
- persistencia documentada de `remoteAccessConfig` com:
  - `actionOneLabel`
  - `actionTwoLabel`
  - `actionOneEnabled`
  - `actionTwoEnabled`
- catalogo oficial de equipamentos de `Device` em:
  - `GET /api/v1/devices/equipment-catalog`
- endpoints principais do App Morador confirmados no OpenAPI atual
- `POST /api/v1/people` alinhado com `birthDate` obrigatorio no App Morador
- `POST /api/v1/facial/register` alinhado com:
  - `consentAccepted: true`
  - `source: APP_MORADOR`
- `visit-forecasts`: App Morador deve parar de enviar campos fora do schema publico e manter dados adicionais em `notes`
