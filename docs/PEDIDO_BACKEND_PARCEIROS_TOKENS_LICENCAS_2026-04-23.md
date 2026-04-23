# Pedido ao backend - Parceiros, chaves de ativacao e licencas

Data: 2026-04-23

## Objetivo

Criar um novo nivel de usuario para empresas parceiras/terceirizadas.

O parceiro deve conseguir cadastrar e gerenciar apenas os proprios clientes, usando chaves de ativacao/licencas emitidas pelo Master.

## Novo papel de usuario

Adicionar o perfil:

```json
"PARCEIRO"
```

Regras:

- `MASTER` gerencia todos os parceiros, clientes, licencas e chaves.
- `PARCEIRO` gerencia apenas clientes vinculados ao proprio parceiro.
- `PARCEIRO` nao pode enxergar clientes diretos da plataforma nem clientes de outros parceiros.
- `PARCEIRO` so pode criar cliente se informar uma chave de ativacao valida.
- `ADMIN`, `OPERADOR`, `CENTRAL` e `MORADOR` permanecem como estao.

## Modelo recomendado

### PartnerCompany

Campos minimos:

```json
{
  "id": "uuid",
  "name": "Empresa Parceira",
  "document": "cnpj ou documento",
  "responsibleName": "Nome do responsavel",
  "responsibleEmail": "email@empresa.com",
  "responsiblePhone": "(00) 00000-0000",
  "status": "ACTIVE",
  "clientLimit": 10,
  "activeClients": 0,
  "allowedModules": ["PEOPLE", "CAMERAS", "DELIVERIES"],
  "createdAt": "2026-04-23T10:00:00Z",
  "updatedAt": "2026-04-23T10:00:00Z"
}
```

Status:

```json
["ACTIVE", "SUSPENDED", "BLOCKED"]
```

### ProvisioningKey

Chave de ativacao/provisionamento usada para criar clientes.

Campos minimos:

```json
{
  "id": "uuid",
  "ownerType": "PARTNER",
  "ownerId": "uuid-do-parceiro",
  "label": "Lote inicial parceiro X",
  "status": "ACTIVE",
  "maxClients": 10,
  "usedClients": 0,
  "allowedModules": ["PEOPLE", "CAMERAS", "DELIVERIES"],
  "expiresAt": "2026-12-31T23:59:59Z",
  "lastUsedAt": null,
  "createdAt": "2026-04-23T10:00:00Z",
  "createdBy": "uuid-do-master"
}
```

Status:

```json
["ACTIVE", "USED", "EXPIRED", "REVOKED"]
```

Owner type:

```json
["PARTNER", "CLIENT"]
```

Observacao de seguranca:

- O token/chave real deve ser mostrado uma unica vez na criacao.
- O banco deve guardar apenas hash da chave.
- A chave deve ter prefixo legivel, mas segredo aleatorio forte.
- Exemplo visual: `V8-PARTNER-2026-ABCD-EFGH-IJKL`.

## Endpoints para o Master

### Listar parceiros

```http
GET /api/v1/master/partners
```

Resposta:

```json
[
  {
    "id": "uuid",
    "name": "Empresa Parceira",
    "document": "00000000000100",
    "status": "ACTIVE",
    "clientLimit": 10,
    "activeClients": 2,
    "allowedModules": ["PEOPLE", "CAMERAS"]
  }
]
```

### Criar parceiro

```http
POST /api/v1/master/partners
```

Payload:

```json
{
  "name": "Empresa Parceira",
  "document": "00000000000100",
  "responsibleName": "Responsavel",
  "responsibleEmail": "email@empresa.com",
  "responsiblePhone": "(00) 00000-0000",
  "status": "ACTIVE",
  "clientLimit": 10,
  "allowedModules": ["PEOPLE", "CAMERAS", "DELIVERIES"]
}
```

### Editar parceiro

```http
PATCH /api/v1/master/partners/{partner_id}
```

Payload parcial com os mesmos campos do cadastro.

### Listar chaves

```http
GET /api/v1/master/provisioning-keys?ownerType=PARTNER&ownerId={partner_id}
```

### Criar chave de ativacao

```http
POST /api/v1/master/provisioning-keys
```

Payload:

```json
{
  "ownerType": "PARTNER",
  "ownerId": "uuid-do-parceiro",
  "label": "Lote inicial",
  "maxClients": 10,
  "allowedModules": ["PEOPLE", "CAMERAS", "DELIVERIES"],
  "expiresAt": "2026-12-31T23:59:59Z"
}
```

Resposta:

```json
{
  "key": {
    "id": "uuid",
    "ownerType": "PARTNER",
    "ownerId": "uuid-do-parceiro",
    "status": "ACTIVE",
    "maxClients": 10,
    "usedClients": 0,
    "allowedModules": ["PEOPLE", "CAMERAS", "DELIVERIES"],
    "expiresAt": "2026-12-31T23:59:59Z"
  },
  "plainToken": "V8-PARTNER-2026-ABCD-EFGH-IJKL"
}
```

Importante:

- `plainToken` deve aparecer somente nessa resposta.
- Em listagens futuras, retornar apenas metadados, nunca o token aberto.

### Revogar chave

```http
PATCH /api/v1/master/provisioning-keys/{key_id}/revoke
```

## Endpoints para o Parceiro

### Listar meus clientes

```http
GET /api/v1/partner/clients
```

Retorna apenas clientes vinculados ao parceiro autenticado.

### Criar cliente usando chave

```http
POST /api/v1/partner/clients
```

Payload:

```json
{
  "provisioningToken": "V8-PARTNER-2026-ABCD-EFGH-IJKL",
  "name": "Cliente do parceiro",
  "clientKind": "CONDOMINIUM",
  "document": "00000000000100",
  "responsibleName": "Responsavel do cliente",
  "responsibleEmail": "cliente@email.com",
  "responsiblePhone": "(00) 00000-0000",
  "enabledModules": ["PEOPLE", "CAMERAS"],
  "adminInitial": {
    "name": "Admin Cliente",
    "email": "admin@cliente.com",
    "password": "senha-provisoria"
  }
}
```

Regras obrigatorias:

- Validar se a chave existe pelo hash.
- Validar se a chave pertence ao parceiro autenticado.
- Validar status `ACTIVE`.
- Validar validade.
- Validar saldo `usedClients < maxClients`, quando houver limite.
- Validar se os modulos solicitados estao dentro de `allowedModules`.
- Criar cliente ja vinculado ao parceiro.
- Incrementar `usedClients`.
- Registrar auditoria da criacao.

### Listar minhas chaves

```http
GET /api/v1/partner/provisioning-keys
```

Retorna metadados das chaves do parceiro autenticado, sem token aberto.

## Ajustes em clientes/licencas atuais

Adicionar aos clientes:

```json
{
  "partnerId": "uuid-ou-null",
  "provisioningKeyId": "uuid-ou-null",
  "licenseOwnerType": "MASTER|PARTNER|CLIENT",
  "licenseSource": "DIRECT|PARTNER_PROVISIONING"
}
```

Sugestao:

- Cliente direto da plataforma: `partnerId = null`.
- Cliente criado por parceiro: `partnerId = uuid-do-parceiro`.
- Master sempre enxerga todos.
- Parceiro enxerga somente `partnerId = parceiro autenticado`.

## Permissoes esperadas

`PARCEIRO` deve poder:

- `partner.clients.read`
- `partner.clients.create`
- `partner.provisioning_keys.read`
- `partner.users.manage` se for permitido criar admins dos clientes dele

`MASTER` deve poder:

- `master.partners.read`
- `master.partners.write`
- `master.provisioning_keys.read`
- `master.provisioning_keys.write`
- `master.provisioning_keys.revoke`

## Front ja preparado

No Portaria Web ja foram preparados:

- papel `PARCEIRO`;
- rota futura `/parceiro`;
- service `partnersService`;
- tipos `PartnerCompany`, `ProvisioningKey` e payloads;
- redirecionamento de login para `/parceiro` quando o backend retornar role `PARCEIRO`.

Falta o backend publicar os endpoints acima para liberar a tela funcional completa.

