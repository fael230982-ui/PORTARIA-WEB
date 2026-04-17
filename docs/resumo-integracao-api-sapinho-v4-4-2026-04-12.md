# Resumo De Integracao API Sapinho V4.4

Data: 2026-04-12
Origem: Portaria Web
Base analisada: `src/api/API Sapinho V4.4.txt`

## Situacao atual

O `Portaria Web` foi ajustado para operar com a `API Sapinho V4.4` sem quebra de build e com os principais contratos novos refletidos em tipos, serviços e telas.

Validacao executada:

- `npm run build` concluido com sucesso em 2026-04-12.

## O que ficou alinhado

- `Master`
  - consumo de `GET /api/v1/master/summary`
  - consumo de `GET /api/v1/master/modules/catalog`
  - consumo de `GET /api/v1/master/operation-devices`
  - leitura de `metrics` por cliente no contrato `PublicMasterClientResponse`

- `Usuarios`
  - suporte a `GET /api/v1/auth/permissions-matrix`
  - comparacao entre matriz oficial do perfil e permissoes efetivas do usuario na UI

- `Moradores`
  - suporte aos campos novos de face: `faceStatus`, `faceUpdatedAt`, `faceErrorMessage`
  - detalhe do morador atualizado para refletir estado facial retornado pela API

- `Encomendas`
  - suporte a OCR de etiqueta e upload de foto
  - suporte aos campos `createdAt`, `updatedAt`, `receivedByName`, `receivedByUserId`
  - suporte aos campos `packagePhotoUrl`, `labelPhotoUrl` e `clientRequestId`
  - normalizacao compatível com o contrato vigente e com o contrato alvo do ecossistema

- `Operacao`
  - historico oficial de troca de turno via `GET /api/v1/operation/shift-changes`
  - registro de troca via `POST /api/v1/operation/shift-change`
  - uso de `GET /api/v1/operation/units` como busca oficial de unidades na tela operacional, com fallback para o catalogo local
  - leitura enriquecida de `deviceStatus`, `deviceLastSeenAt` e `lastHeartbeatDelaySeconds`

- `Stream de eventos`
  - tipagem atualizada para o shape da `V4.4`
  - suporte a `eventId`, `occurredAt`, `unitId`, `entityId`, `title`, `body` e `payload`

## Observacoes

- O projeto segue com fallback em pontos onde o backend ainda nao entrega contrato fechado em todos os ambientes.
- A base foi mantida compativel com o `CONTRATO_PADRAO_ECOSSISTEMA_2026-04-11.md`.
- A pasta local deste documento permanece em `my-app/docs`, e a copia compartilhada deve ser mantida em `C:\Users\Pc Rafa\Desktop\DES-RAFIELS`.
