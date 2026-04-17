# Contrato backend - veiculos e filtros por unidade

Data: 2026-04-10

## Objetivo

Persistir veiculos no backend real e padronizar filtros por unidade para evitar que o front precise buscar listas administrativas completas e filtrar localmente.

## Veiculos

Hoje o front possui tela `/admin/veiculos`, mas usa API local do Next:

```txt
/api/admin/veiculos
/api/admin/veiculos/{id}
```

Isso serve para validar UI, mas nao e persistencia definitiva.

### Endpoints esperados

```http
GET /api/v1/vehicles
POST /api/v1/vehicles
GET /api/v1/vehicles/{id}
PUT /api/v1/vehicles/{id}
DELETE /api/v1/vehicles/{id}
```

### Filtros esperados

```txt
unitId
condominiumId
ownerId
plate
status
type
page
limit
```

Exemplo:

```http
GET /api/v1/vehicles?unitId=7db846ab-073a-4b09-b3ed-1d9242b6e19f
```

### Payload de criacao/edicao

```json
{
  "plate": "ABC1D23",
  "brand": "Toyota",
  "model": "Corolla",
  "color": "Prata",
  "type": "carro",
  "status": "ativo",
  "ownerId": "uuid-opcional",
  "unitId": "uuid-da-unidade",
  "tag": "TAG-123",
  "notes": "Observacao operacional"
}
```

### Resposta recomendada

```json
{
  "id": "uuid",
  "plate": "ABC1D23",
  "brand": "Toyota",
  "model": "Corolla",
  "color": "Prata",
  "type": "carro",
  "status": "ativo",
  "ownerId": "uuid-opcional",
  "ownerName": "Nome do responsavel",
  "unitId": "uuid-da-unidade",
  "unitLabel": "Casa20",
  "structureLabel": "Rua A",
  "condominiumName": "Condominio",
  "tag": "TAG-123",
  "notes": "Observacao operacional",
  "createdAt": "2026-04-10T10:00:00.000Z",
  "updatedAt": "2026-04-10T10:00:00.000Z"
}
```

## Filtros por unidade nos endpoints existentes

O front agora envia filtros quando abre telas a partir do modal de unidade.

### Encomendas

```http
GET /api/v1/deliveries?recipientUnitId={unitId}
```

Regra:

```txt
ADMIN/MASTER/OPERADOR: pode consultar conforme escopo operacional.
MORADOR: pode consultar somente se recipientUnitId estiver em user.unitIds.
```

### Cameras

```http
GET /api/v1/cameras?unitId={unitId}
```

Regra:

```txt
ADMIN/MASTER/OPERADOR: pode consultar conforme escopo operacional.
MORADOR: pode consultar somente se unitId estiver em user.unitIds.
```

### Logs de acesso

```http
GET /api/v1/access-logs?unitId={unitId}
```

Regra:

```txt
Retornar eventos correlacionados a pessoas, cameras ou dispositivos da unidade.
```

Campos uteis:

```txt
unitId
unitLabel
doorId
doorName
deviceId
deviceName
authMethod
```

## Beneficio esperado

Com esses filtros, o front deixa de depender de busca ampla + filtro local para telas de unidade. Isso reduz volume de dados, evita vazamento acidental de escopo e alinha web admin com app morador.
