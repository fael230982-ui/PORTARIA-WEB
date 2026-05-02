# Preparacao Portaria Web - Fase 2 de cameras do morador

Data: 2026-05-02

## Decisao

A solicitacao do App Morador foi separada da Fase 1 do Portaria Web.

O Portaria Web pode ficar preparado para ler campos futuros sem interferir no fechamento da Fase 1, mas a tela de gestao de grupos personalizados de cameras deve ser tratada como Fase 2 do Portaria, porque depende de contrato publico do backend.

## O que ja ficou preparado no Portaria Web

O front passa a aceitar e normalizar, quando o backend enviar:

- `residentDisplayOrder`
- `residentMainSuggested`
- `residentCameraGroupId`
- `residentCameraGroupName`
- `residentCameraGroupOrder`

Na area do morador dentro do Portaria Web, a ordenacao das cameras ja respeita:

1. camera principal sugerida;
2. ordem do grupo;
3. ordem da camera;
4. nome da camera.

Se o backend ainda nao enviar esses campos, o comportamento atual permanece funcionando com fallback por nome.

## O que nao foi implementado agora

Nao foi criada tela de CRUD de grupos de cameras do morador, porque ainda falta contrato oficial para persistencia.

Endpoints esperados para Fase 2:

- `GET /api/v1/resident-camera-groups`
- `POST /api/v1/resident-camera-groups`
- `PATCH /api/v1/resident-camera-groups/{id}`
- `DELETE /api/v1/resident-camera-groups/{id}`

Campos esperados:

- `name`
- `displayOrder`
- `icon`
- `color`
- `condominiumId`
- `active`

## Status

Compatibilidade de leitura: preparada.

Tela de gestao persistente: pendente de backend e deve entrar na Fase 2 do Portaria Web.
