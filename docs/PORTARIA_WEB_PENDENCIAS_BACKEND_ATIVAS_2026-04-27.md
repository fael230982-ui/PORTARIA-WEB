# Portaria Web - Pendencias Ativas de Backend - 2026-04-27

## Objetivo

Manter a lista atual das pendencias reais de backend que continuam impactando o `Portaria Web` apos a validacao da `API v6.8`.

## 1. Inbox global da operacao

### Situacao atual

O contrato util continua confirmado apenas por unidade:

- `GET /api/v1/messages?unitId=...`
  - `200`

Tambem foi validado:

- `GET /api/v1/messages/whatsapp/connection?unitId=...`
  - `200`

Mas ainda nao ha contrato final confirmado para inbox global sem `unitId`.

### Impacto

- historico por unidade funciona
- caixa global da portaria continua sem contrato definitivo

### O backend deve alinhar

1. confirmar se existira inbox global sem `unitId`
2. ou formalizar que a operacao deve agregar mensagens por varias `unitIds`

## 2. Fechamento do fluxo VMS Incoresoft

### Situacao atual

O front ja esta preparado para:

- criar e listar servidor VMS
- consultar cameras existentes no servidor
- reaproveitar camera do VMS
- usar `shouldCreateNewCamera`
- orientar cadastro de camera nova quando necessario

O lookup do servidor VMS ja foi validado nas rodadas anteriores.

### Impacto

- a preparacao do fluxo ja existe no front
- a homologacao final do cadastro da camera ainda depende de nova rodada estavel de backend

### O backend deve alinhar

1. manter estavel o `POST /api/v1/cameras` no fluxo VMS
2. devolver resposta consistente tanto no reaproveitamento quanto na criacao nova
3. manter estavel a resposta final do cadastro da camera no fluxo Incoresoft

## Itens alinhados na v6.8

Continuam alinhados com o front:

- `auth/me`
- `auth/sync-capabilities`
- `auth/stream-capabilities`
- `auth/permissions-matrix`
- `resident/profile`
- `resident/notification-preferences`
- `/media/`
- `faceEngineServerId`
- `remote-open` direto do Control ID
- `PATCH /devices/{id}`
- contrato estruturado do lookup de cameras VMS
- envelopes `value` / `Count` em listagens administrativas

## Compatibilidade aplicada no front nesta rodada

O `Portaria Web` foi ajustado para aceitar `value` / `Count` tambem em:

- `permissions-matrix`
- `master/provisioning-keys`
- `partner/provisioning-keys`
- `master/partners`
- `partner/clients`
- `integrations/vms/servers`
- `integrations/face/servers`
- `devices`
- `PATCH /devices/{id}` como fluxo principal de edicao de `Device`

## Resumo objetivo

Depois da `v6.8`, as pendencias reais de backend continuam concentradas em:

1. inbox global da operacao
2. fechamento final do fluxo VMS Incoresoft
