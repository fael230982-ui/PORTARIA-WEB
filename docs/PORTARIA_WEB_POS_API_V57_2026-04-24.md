# Portaria Web - Validação Pós API v5.7 - 2026-04-24

## Objetivo

Consolidar o que foi validado de forma real após a chegada da documentação da API v5.7, separando o que já saiu da lista de pendências do que ainda depende do backend.

## Contrato confirmado na v5.7

### Mensagens

- `GET /api/v1/messages` exige `unitId` como parâmetro obrigatório.
- Portanto, a caixa global do operador não pode depender de `GET /messages` sem unidade.

### Operação

- `GET /api/v1/operation/units` agora aceita `q` vazio.
- `GET /api/v1/operation/shift-changes` permanece documentado normalmente na v5.7.

### Morador

- `GET /api/v1/resident/notification-preferences` está documentado com resposta `200`.
- `GET /api/v1/resident/profile` continua usando `PublicUserResponse`.
- No schema `PublicUserResponse`, não existem os campos:
  - `phone`
  - `photoUrl`
  - `photoUri`
  - `faceStatus`

### Autenticação

- A v5.7 passou a prever no schema `PublicUserResponse` os campos:
  - `unitId`
  - `unitIds`
  - `selectedUnitId`
  - `selectedUnitName`

## Testes reais executados

### 1. Operação

#### `GET /api/v1/operation/units?q=&limit=100`

Resultado real:

- `200`
- retornou lista de unidades

Conclusão:

- pendência encerrada

#### `GET /api/v1/operation/shift-changes?limit=8`

Resultado real:

- `200`
- retorno `[]`

Conclusão:

- pendência encerrada

### 2. Câmera RTSP homologada

Fluxo testado:

- `POST /api/v1/cameras/async`
- stream usado:
  - `rtsp://muralha:muralha5514@192.168.0.153:554/cam/realmonitor?channel=1&subtype=0`

Resultado real:

- job criado com id `0bdfffe1-ab76-4c36-8d61-f538e2b727e1`
- job finalizou como `SUCCEEDED`
- câmera encontrada na listagem com id `0700e4e9-269b-46f2-8c15-e7f7dc73b6a6`
- `GET /api/v1/cameras/{id}/streaming` respondeu corretamente

Campos confirmados no retorno:

- `liveUrl`
- `hlsUrl`
- `preferredLiveUrl`
- `webRtcUrl`
- `snapshotUrl`
- `imageStreamUrl`

Conclusão:

- pendência crítica de RTSP homologado com `192.168.0.153` encerrada
- o IP `192.168.0.154` continua fora da referência de validação

### 3. Notificações do morador

#### `GET /api/v1/resident/notification-preferences`

Resultado real:

- `200`

Conclusão:

- pendência encerrada

### 4. Perfil do morador

#### `GET /api/v1/resident/profile`

Resultado real:

- `200`
- continua sem:
  - `phone`
  - `photoUrl`
  - `photoUri`
  - `faceStatus`

#### `GET /api/v1/people/{personId}`

Resultado real:

- expõe:
  - `photoUrl`
  - `faceStatus`
- também expõe `phone`, embora no caso testado tenha vindo `null`

Conclusão:

- continua existindo divergência real de contrato entre `resident/profile` e `people/{id}`
- isso impacta a web e o app do morador

### 5. Mensagens entre morador e operador

#### `GET /api/v1/messages?limit=10`

Resultado real:

- `400`
- retorno: `Field required`

Leitura:

- está compatível com a v5.7, porque `unitId` é obrigatório

#### `GET /api/v1/auth/me` no perfil OPERADOR

Resultado real:

- `200`
- porém veio com:
  - `unitId = null`
  - `unitIds = []`
  - `selectedUnitId = null`

Conclusão:

- a pendência deixou de ser “erro genérico de mensagens”
- agora a pendência real é de contrato para a caixa operacional:
  1. ou o backend precisa fornecer `unitId/unitIds` úteis no `auth/me` do operador
  2. ou precisa oferecer uma rota própria de caixa de entrada da portaria

### 6. Dispositivo facial

Fluxo testado:

- `POST /api/v1/devices`

Resultado real:

- backend respondeu com criação e id `57432391-a51c-470b-8554-323a10557c25`

Retestes imediatamente após a criação:

- `GET /api/v1/devices?condominiumId=...`:
  - `200`
  - item não apareceu na lista
- `GET /api/v1/devices`:
  - `200`
  - item não apareceu na lista
- `GET /api/v1/devices/57432391-a51c-470b-8554-323a10557c25`:
  - `404`
  - `Device não encontrado`

Conclusão:

- esta pendência continua aberta
- o backend confirma criação, mas o item não fica disponível para consulta consistente

## Pendências reais após a v5.7

### 1. Mensagens operacionais

Situação atual:

- `GET /api/v1/messages` exige `unitId`
- o operador testado não recebe `unitId/unitIds` úteis no `auth/me`

Necessidade do backend:

1. definir o contrato oficial da caixa de entrada operacional
2. expor as unidades acessíveis do operador no `auth/me`, ou
3. criar uma leitura global própria para a portaria

### 2. Perfil do morador

Situação atual:

- `resident/profile` não expõe os campos que o front precisa para perfil completo

Necessidade do backend:

1. alinhar `resident/profile` com os dados já expostos em `people/{id}`
2. avaliar inclusão de:
   - `phone`
   - `photoUrl` ou `photoUri`
   - `faceStatus`

### 3. Dispositivo facial

Situação atual:

- o `POST /devices` devolve sucesso
- o dispositivo recém-criado não aparece em listagem
- a busca direta por id retorna `404`

Necessidade do backend:

1. confirmar persistência real do item após o cadastro
2. confirmar se existe filtro de escopo/condomínio excluindo o item da listagem
3. garantir consistência entre:
   - `POST /devices`
   - `GET /devices`
   - `GET /devices/{id}`

## Itens que saíram da lista de pendências

- `GET /api/v1/operation/units?q=&limit=100`
- `GET /api/v1/operation/shift-changes?limit=8`
- `GET /api/v1/resident/notification-preferences`
- fluxo RTSP homologado com `192.168.0.153`

## Resumo objetivo

Depois da API v5.7 e dos testes reais, as pendências de backend da Portaria Web ficaram reduzidas a três blocos:

1. caixa de mensagens do operador
2. contrato incompleto de `resident/profile`
3. cadastro/listagem inconsistente de dispositivo facial
