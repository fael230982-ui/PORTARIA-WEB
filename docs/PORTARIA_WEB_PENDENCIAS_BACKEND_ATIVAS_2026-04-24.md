# Portaria Web - Pendências Ativas de Backend - 2026-04-24

## Objetivo

Manter em uma lista única apenas as pendências reais de backend que continuam abertas após as validações mais recentes.

## 1. Mensagens globais da operação

### Situação atual

Teste real executado:

- `GET /api/v1/messages?unitId=...&limit=5`
  - `200`
- `GET /api/v1/messages?limit=5`
  - `400`
  - retorno:
    - `Field required`

### Impacto

- o histórico por unidade funciona
- a caixa de entrada global da portaria continua sem contrato suficiente para listar mensagens sem `unitId`

### O backend deve alinhar

1. se a leitura global da portaria realmente deve exigir `unitId`
2. se haverá rota própria para inbox global
3. ou se o contrato esperado da web deve ser agregação por múltiplas `unitIds`

## 2. Criação final de câmera no fluxo VMS Incoresoft

### Situação atual

Teste real executado:

- `POST /api/v1/integrations/vms/servers`
  - `201`
- `GET /api/v1/integrations/vms/servers/{server_id}/cameras`
  - contrato novo já integrado no front
- `POST /api/v1/cameras`
  - no fallback com `vmsServerId + streamUrl`
  - resposta atual:
    - `503 Service Temporarily Unavailable`

### Impacto

- o cadastro do servidor VMS funciona
- a integração do contrato de lookup do VMS foi aplicada no front
- a etapa final de cadastrar a câmera localmente no backend ainda não conclui

### O backend deve alinhar

1. estabilizar `POST /api/v1/cameras` no fluxo VMS
2. confirmar o body esperado quando o backend não conseguir provisionar
3. confirmar se há diferença entre reaproveitamento de câmera existente e fallback de criação nova no mesmo endpoint

## Itens que saíram da lista

Após as validações mais recentes, deixaram de ser pendência:

- contrato de `auth/me` para operador
- contrato de mensagens por unidade na operação
- contrato de `resident/profile`
- encaminhamento de `/media/`
- `GET /api/v1/operation/units?q=&limit=100`
- `GET /api/v1/operation/shift-changes?limit=8`
- `GET /api/v1/resident/notification-preferences`
- fluxo RTSP homologado com `192.168.0.153`
- criação de dispositivo facial para admin escopado
- envio de `condominiumId` no cadastro de dispositivos

## Resumo objetivo

Hoje, as pendências reais de backend da web ficaram concentradas em:

1. leitura global das mensagens da operação
2. criação final de câmera no fluxo VMS Incoresoft
