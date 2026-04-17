# Pedido ao backend - App morador Casa20: encomendas e cameras

Data: 2026-04-10

## Contexto

O app morador esta logado com token de perfil `MORADOR` na unidade Casa20.

UnitId da Casa20:

```txt
7db846ab-073a-4b09-b3ed-1d9242b6e19f
```

No web admin, existem 3 encomendas e 1 camera vinculadas a esta unidade. Elas aparecem no painel web porque o token usado e admin/operacional e o front filtra localmente apos buscar listas administrativas.

No app morador, o token e de `MORADOR` e a chamada e feita diretamente para a API externa.

## Chamadas feitas pelo app morador

```http
GET /api/v1/deliveries
GET /api/v1/deliveries?recipientUnitId=7db846ab-073a-4b09-b3ed-1d9242b6e19f
GET /api/v1/cameras
GET /api/v1/cameras?unitId=7db846ab-073a-4b09-b3ed-1d9242b6e19f
```

Headers relevantes:

```http
Authorization: Bearer <token-morador>
X-Selected-Unit-Id: 7db846ab-073a-4b09-b3ed-1d9242b6e19f
```

## Resultado atual

```txt
GET /api/v1/deliveries -> 403 Permissao negada
GET /api/v1/deliveries?recipientUnitId=... -> 403 Permissao negada
GET /api/v1/cameras -> 200 OK, mas array vazio
GET /api/v1/cameras?unitId=... -> 200 OK, mas array vazio
```

## O que precisamos confirmar

1. Confirmar se o usuario morador logado esta vinculado a unidade:

```txt
7db846ab-073a-4b09-b3ed-1d9242b6e19f
```

Verificar campos como:

```txt
user.unitId
user.unitIds
user.selectedUnitId
relacao morador <-> unidade
```

2. Confirmar se `/api/v1/deliveries` deve permitir `MORADOR` consultar encomendas da propria unidade.

Hoje retorna `403`.

3. Confirmar se `/api/v1/cameras` deve permitir `MORADOR` listar cameras da propria unidade.

Hoje retorna `200`, mas sem itens.

4. Se esses endpoints forem apenas administrativos, informar quais endpoints o app morador deve usar para:

```txt
- minhas encomendas da unidade
- cameras da minha unidade
```

## Regra esperada se os endpoints atuais forem reaproveitados

Liberar escopo por unidade para perfil `MORADOR`.

### Deliveries

`MORADOR` pode listar apenas encomendas onde:

```txt
delivery.recipientUnitId in user.unitIds
```

Com filtro explicito:

```http
GET /api/v1/deliveries?recipientUnitId=7db846ab-073a-4b09-b3ed-1d9242b6e19f
```

Comportamento esperado:

```txt
Se recipientUnitId pertence ao morador: 200 com encomendas da unidade.
Se recipientUnitId nao pertence ao morador: 403.
Sem recipientUnitId: 200 apenas com encomendas das unidades do morador.
```

### Cameras

`MORADOR` pode listar apenas cameras onde:

```txt
camera.unitId in user.unitIds
```

Com filtro explicito:

```http
GET /api/v1/cameras?unitId=7db846ab-073a-4b09-b3ed-1d9242b6e19f
```

Comportamento esperado:

```txt
Se unitId pertence ao morador: 200 com cameras da unidade.
Se unitId nao pertence ao morador: 403.
Sem unitId: 200 apenas com cameras das unidades do morador.
```

## Resultado esperado para Casa20

Com token `MORADOR` vinculado a Casa20:

```txt
GET /api/v1/deliveries?recipientUnitId=7db846ab-073a-4b09-b3ed-1d9242b6e19f
-> 200 OK com 3 encomendas

GET /api/v1/cameras?unitId=7db846ab-073a-4b09-b3ed-1d9242b6e19f
-> 200 OK com 1 camera
```

## Observacao sobre o web admin

Foi corrigido no proxy do web o repasse do header:

```http
X-Selected-Unit-Id
```

Antes, o Axios do browser adicionava esse header, mas o proxy `/api/proxy` so repassava `Authorization` e `Content-Type`.

Essa correcao melhora consistencia no web, mas nao resolve o app morador, porque o app chama a API externa diretamente. O ponto principal e a regra de autorizacao/escopo da API com token `MORADOR`.
