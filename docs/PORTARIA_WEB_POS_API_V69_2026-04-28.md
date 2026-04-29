# PORTARIA WEB POS API V6.9 - 2026-04-28

## Resumo objetivo

A `v6.9` nao exigiu refatoracao ampla no `Portaria Web`.

O delta realmente util desta rodada foi:

- catalogo oficial de equipamentos de `Device` em:
  - `GET /api/v1/devices/equipment-catalog`
- confirmacao formal dos campos de acionamento em `remoteAccessConfig`:
  - `actionOneLabel`
  - `actionTwoLabel`
  - `actionOneEnabled`
  - `actionTwoEnabled`

## O que foi aplicado no front

- `Admin > Dispositivos` agora tenta consumir primeiro:
  - `/api/v1/devices/equipment-catalog`
- se essa rota nao estiver disponivel no ambiente, o front cai para compatibilidade em:
  - `/api/v1/integrations/face/equipment-catalog`

## O que foi validado no contrato

- `GET /api/v1/messages` continua exigindo `unitId`
  - a inbox global da operacao continua pendente de backend
- `remoteAccessConfig` segue documentado com os campos usados pela portaria
- `PATCH /api/v1/devices/{id}` continua sendo o fluxo principal correto para edicao de `Device`

## Impacto pratico

- `Dispositivos` fica alinhado com o catalogo oficial novo da API
- os acionamentos personalizados seguem compativeis com o contrato novo
- nao houve mudanca obrigatoria em `Cameras`, `Operacao` ou `Morador` nesta rodada

## Pendencias que continuam

- inbox global da operacao sem `unitId`
- fechamento final do fluxo VMS Incoresoft
- validacao pratica do catalogo novo no ambiente, se o backend ja estiver devolvendo fabricantes/modelos na rota oficial
