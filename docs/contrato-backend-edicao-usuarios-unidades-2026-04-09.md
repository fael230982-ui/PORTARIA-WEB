# Contrato backend - Edição de usuários e unidades - 2026-04-09

O front já possui listagem e criação, mas a API V3.5 local não expõe endpoints de edição para usuários e unidades.

## Usuários

Endpoint necessário:

```http
PATCH /api/v1/users/{id}
```

Payload sugerido:

```json
{
  "name": "Nome atualizado",
  "email": "usuario@exemplo.com",
  "role": "MORADOR",
  "condominiumId": "condominium-id",
  "unitId": "unit-id",
  "unitIds": ["unit-id"],
  "personId": "person-id",
  "streetIds": []
}
```

Resposta:

```json
{
  "id": "user-id",
  "name": "Nome atualizado",
  "email": "usuario@exemplo.com",
  "role": "MORADOR",
  "permissions": [],
  "scopeType": "RESIDENT",
  "condominiumId": "condominium-id",
  "unitId": "unit-id",
  "unitIds": ["unit-id"],
  "personId": "person-id"
}
```

Endpoint opcional para status:

```http
PATCH /api/v1/users/{id}/status
```

Payload:

```json
{
  "status": "ACTIVE"
}
```

Valores esperados:

- `ACTIVE`
- `BLOCKED`
- `INACTIVE`

## Unidades

Endpoint necessário para editar unidade:

```http
PATCH /api/v1/units/{id}
```

Payload sugerido:

```json
{
  "name": "102",
  "streetId": "street-id",
  "address": "Complemento opcional"
}
```

Resposta esperada:

```json
{
  "id": "unit-id",
  "name": "102",
  "streetId": "street-id",
  "condominiumId": "condominium-id",
  "address": "Complemento opcional"
}
```

Endpoint necessário para editar estrutura/rua:

```http
PATCH /api/v1/streets/{id}
```

Payload sugerido:

```json
{
  "name": "BLOCK:A",
  "condominiumId": "condominium-id"
}
```

## Por que precisa

- Corrigir unidade digitada errada sem excluir/recriar.
- Corrigir vínculo de usuário morador com `personId`/unidade.
- Ajustar e-mail de login do app-morador.
- Bloquear/inativar acesso sem apagar histórico.
