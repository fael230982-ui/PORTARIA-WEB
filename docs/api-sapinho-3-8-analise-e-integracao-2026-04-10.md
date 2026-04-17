# API Sapinho V3.8 - analise e integracao

Data: 2026-04-10

## Arquivo analisado

- `src/api/API Sapinho V3.8.txt`

## Diferenca principal em relacao a V3.7

A V3.8 adicionou endpoints oficiais de veiculos:

- `GET /api/v1/vehicles`
- `POST /api/v1/vehicles`
- `GET /api/v1/vehicles/{id}`
- `PUT /api/v1/vehicles/{id}`
- `DELETE /api/v1/vehicles/{id}`

Nao foram encontrados paths removidos em relacao a V3.7.

## Contrato de listagem

`GET /api/v1/vehicles`

Query params:

- `page`
- `limit`
- `unitId`
- `condominiumId`
- `ownerId`
- `plate`
- `status`
- `type`

Resposta:

- `PaginatedResponse[PublicVehicleResponse]`

## Contrato de criacao

`POST /api/v1/vehicles`

Body:

```json
{
  "plate": "ABC1234",
  "brand": "Toyota",
  "model": "Corolla",
  "color": "Prata",
  "type": "carro",
  "status": "ativo",
  "ownerId": "uuid opcional",
  "unitId": "uuid",
  "tag": "opcional",
  "notes": "opcional"
}
```

Campos obrigatorios:

- `plate`
- `type`
- `unitId`

Enums:

- `type`: `carro`, `moto`, `caminhao`, `outro`
- `status`: `ativo`, `inativo`, `bloqueado`

## Integrado no front

Arquivos:

- `src/services/vehicles.service.ts`
- `src/types/vehicle.ts`
- `src/app/admin/veiculos/page.tsx`

Alteracoes:

- A tela `/admin/veiculos` passou a usar a API oficial `/vehicles`.
- Criacao usa `POST /vehicles`.
- Edicao usa `PUT /vehicles/{id}`.
- Exclusao usa `DELETE /vehicles/{id}`.
- Listagem usa `GET /vehicles?page=1&limit=100`.
- Mantido endpoint local apenas para consulta externa de placa: `/api/admin/veiculos/lookup`.
- Tipos de veiculo foram alinhados ao enum oficial da API.

## Observacoes

O front envia para a API apenas os campos oficiais:

- `plate`
- `brand`
- `model`
- `color`
- `type`
- `status`
- `ownerId`
- `unitId`
- `tag`
- `notes`

Campos derivados como `ownerName`, `unitLabel`, `structureLabel` e `condominiumName` devem vir da resposta da API, nao do request.

