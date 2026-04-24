# Portaria Web - Matriz de Smoke Test Backend - 2026-04-24

## Objetivo

Registrar o resultado real dos testes de comunicação entre o front web e a API por perfil de acesso, antes da próxima publicação no GitHub.

Os testes foram executados via `localhost`, usando o mesmo proxy consumido pelo front.

## Perfis validados

### Morador

- Login validado com sucesso.
- Credencial usada no teste:
  - `teles@sapinho.com`
- Situação:
  - autenticação funcional
  - sem divergência crítica registrada nesta rodada

### Operador

- Login validado com sucesso.
- Credencial usada no teste:
  - `cris@v8.com`

#### Endpoints OK

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/cameras`
- `GET /api/v1/devices?condominiumId=...`
- `GET /api/v1/people?limit=20&page=1`
- `GET /api/v1/vehicles?page=1&limit=20`
- `GET /api/v1/deliveries?limit=20&page=1`
- `GET /api/v1/alerts?limit=8`
- `GET /api/v1/access-logs?limit=20&result=ALLOWED`
- `GET /api/v1/actions`

#### Divergências

- `GET /api/v1/units?condominiumId=...`
  - retorno `403`
  - mensagem: permissão negada
- `GET /api/v1/jobs?limit=5`
  - retorno `403`
  - mensagem: permissão negada
- `GET /api/v1/operation/units?q=&limit=100`
  - retorno `400`
  - a API exige pelo menos 1 caractere em `q`
- `GET /api/v1/operation/shift-changes?limit=8`
  - retorno `500`
- `GET /api/v1/cameras/{id}/streaming`
  - retorno `404` no identificador testado

### Admin

- Login validado com sucesso.
- Credencial usada no teste:
  - `admin@v8.com`

#### Endpoints OK

- `GET /api/v1/auth/me`
- `GET /api/v1/cameras`
- `GET /api/v1/devices?condominiumId=...`
- `GET /api/v1/units?condominiumId=...`
- `GET /api/v1/people?limit=20&page=1`
- `GET /api/v1/vehicles?page=1&limit=20`
- `GET /api/v1/deliveries?limit=20&page=1`
- `GET /api/v1/alerts?limit=8`
- `GET /api/v1/access-logs?limit=20&result=ALLOWED`
- `GET /api/v1/jobs?limit=5`
- `GET /api/v1/actions`

#### Divergências

- `GET /api/v1/operation/units?q=&limit=100`
  - retorno `400`
  - a API exige busca não vazia
- `GET /api/v1/operation/shift-changes?limit=8`
  - retorno `500`
- `GET /api/v1/cameras`
  - retorno `200`, mas lista vazia no teste
  - precisa confirmar se realmente não havia câmera no escopo ou se a listagem não refletiu o cadastro

### Master

- Login validado com sucesso.
- Credencial usada no teste:
  - `admin@sapinho.com`

#### Endpoints OK

- `GET /api/v1/auth/me`
- `GET /api/v1/condominiums`
- `GET /api/v1/cameras`
- `GET /api/v1/devices`
- `GET /api/v1/units`
- `GET /api/v1/people?limit=20&page=1`
- `GET /api/v1/vehicles?page=1&limit=20`
- `GET /api/v1/deliveries?limit=20&page=1`
- `GET /api/v1/alerts?limit=8`
- `GET /api/v1/access-logs?limit=20&result=ALLOWED`
- `GET /api/v1/jobs?limit=5`
- `GET /api/v1/actions`

#### Divergências

- `GET /api/v1/operation/shift-changes?limit=8`
  - retorno `500`

## Pendências abertas por módulo

### Câmeras

- Confirmar persistência e retorno na listagem após `POST /api/v1/cameras/async`
- Confirmar refletir câmera criada no `GET /api/v1/cameras`
- Confirmar contrato de `liveUrl`, `hlsUrl`, `webRtcUrl`, `imageStreamUrl` e `snapshotUrl`
- Confirmar disponibilidade de `GET /api/v1/cameras/{id}/streaming`

### Dispositivos

- O front já está tolerante a formatos variados, cache local e preservação da lista
- Ainda precisa confirmar estabilidade do `GET /api/v1/devices` quando o backend oscila

### Operação

- Ajustar `GET /api/v1/operation/shift-changes?limit=8`
- Definir se `GET /api/v1/operation/units` deve aceitar `q` vazio ou se o front deve sempre exigir busca digitada

### Autenticação e sessão

- Confirmar política de expiração do token
- Confirmar se existe `refresh token`
- Confirmar mensagem padrão para sessão expirada

### Mídias

- Continuam dependentes de arquivo real existir no servidor
- URLs com `404` real não podem ser recuperadas apenas no front

## Situação atual

- `MASTER`: estável para a maior parte dos módulos
- `ADMIN`: estável na maioria dos endpoints, com atenção especial à listagem de câmeras
- `OPERADOR`: ainda depende de ajuste de permissão e operação
- `MORADOR`: autenticação confirmada nesta rodada

## Recomendação antes do próximo push

- manter publicação permitida para melhorias de UX e blindagem do front
- não considerar a integração operacional 100% homologada enquanto persistirem:
  - `shift-changes` com `500`
  - `operation/units` com `400` em busca vazia
  - inconsistência de listagem em câmeras
