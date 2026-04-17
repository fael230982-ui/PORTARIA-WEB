# Contrato backend - Login de morador e senha - 2026-04-09

## Login do app-morador

O front web cria usuário autenticável via:

```http
POST /api/v1/users
```

Payload que o front está preparado para enviar para perfil morador:

```json
{
  "name": "Nome do morador",
  "email": "morador@exemplo.com",
  "password": "senha-temporaria",
  "role": "MORADOR",
  "condominiumId": "condominium-id",
  "unitId": "unit-id",
  "unitIds": ["unit-id"],
  "personId": "person-id"
}
```

Pontos que o backend precisa confirmar:

- `personId` vincula o usuário autenticável ao cadastro real em `/people`.
- `unitId` define a unidade principal.
- `unitIds` define todas as unidades liberadas para o morador.
- `POST /api/v1/auth/login` aceita esse e-mail e senha.
- `GET /api/v1/auth/me` retorna `unitIds`, `unitNames`, `selectedUnitId`, `selectedUnitName` e `requiresUnitSelection`.

## Reset ou reenvio de senha

A API V3.5 local não mostra endpoint de reset/reenvio de senha.

Contrato recomendado para enviar link por e-mail:

```http
POST /api/v1/users/{id}/password-reset
```

Resposta:

```json
{
  "message": "E-mail de redefinição enviado."
}
```

Contrato recomendado para admin definir senha temporária:

```http
PATCH /api/v1/users/{id}/password
```

Payload:

```json
{
  "password": "nova-senha-temporaria"
}
```

Resposta:

```json
{
  "message": "Senha atualizada com sucesso."
}
```

Regra recomendada:

- Sempre que admin definir senha temporária, marcar o usuário para trocar senha no primeiro login, se o backend suportar esse controle.
- Se houver envio por e-mail, não retornar senha em texto puro.
