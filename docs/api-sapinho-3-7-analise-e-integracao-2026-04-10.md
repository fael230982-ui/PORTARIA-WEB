# API Sapinho V3.7 - analise e integracao no front

Data: 2026-04-10

## Arquivo analisado

- `src/api/API Sapinho V3.7.txt`

## Novidades relevantes encontradas

### Edicao administrativa

- `PATCH /api/v1/users/{id}`
- `PATCH /api/v1/units/{id}`

O front ja possui chamadas prontas para esses endpoints. Em teste anterior contra o ambiente publicado, eles ainda retornavam `404`, entao a tela exibe mensagem orientando que o endpoint ainda nao esta publicado naquele ambiente.

### Acionamentos operacionais

- `GET /api/v1/actions`
- `POST /api/v1/actions/{action_id}/execute`

Contrato v3.7:

- action: `id`, `label`, `category`, `requiresConfirmation`, `auditRequired`
- execute body: `reason`, `payload`
- execute response: `executionId`, `actionId`, `status`, `actorUserId`, `actorUserName`, `executedAt`, `result`, `failureReason`

Integrado no front:

- `src/services/operation.service.ts` normaliza `category` para o campo interno `kind`.
- O modal "Painel de acionamentos" na tela `/operacao` agora usa as actions reais quando a API retorna dados.
- O POST de acionamento envia `reason` e `payload` no formato da v3.7.

### Mensagens portaria/morador

- `GET /api/v1/messages?unitId=...&limit=...&unreadOnly=...`
- `POST /api/v1/messages`
- `PATCH /api/v1/messages/{id}/read`

Contrato v3.7:

- request: `unitId`, `body`, `origin`, `direction`
- response: `id`, `unitId`, `unitName`, `senderUserId`, `senderUserName`, `direction`, `origin`, `body`, `status`, `readAt`, `createdAt`

Integrado no front:

- `src/services/operation.service.ts` normaliza `body` para `text`, `origin` para `channel`, `unitName` para `unitLabel`.
- No detalhe do morador da tela `/operacao`, o front lista mensagens da unidade e permite enviar mensagem para a unidade quando existe `unitId`.
- O hook `useOperationMessages` so dispara quando existe `unitId`, pois o parametro e obrigatorio na v3.7.

### Eventos em tempo real

- `GET /api/v1/events/stream`

O hook `useOperationEvents` ja existe e aponta para `/api/v1/events/stream`. Ainda nao foi ativado visualmente na tela principal porque o contrato da documentacao aparece como `application/json`, mas o nome indica stream/SSE. O backend precisa confirmar se o token deve ir por header, cookie ou query string, porque `EventSource` nativo nao permite header `Authorization`.

### Retirada por QR/codigo

- `GET /api/v1/deliveries/withdrawal-qr/{code}`
- Ja existia tambem `POST /api/v1/deliveries/{id}/validate-withdrawal`

O front ja possui:

- baixa de encomenda por codigo dentro da Operacao;
- tela `/admin/encomendas/retirada-rapida`;
- detalhe de encomenda com timeline.

## Pontos que ainda dependem de confirmacao/backend

1. Publicar os endpoints `PATCH /users/{id}` e `PATCH /units/{id}` no mesmo ambiente usado pelo front.
2. Confirmar se `/events/stream` e SSE real e como autenticar sem header `Authorization`.
3. Confirmar quais `category` de actions o backend vai retornar para mapear icones/cores especificos.
4. Confirmar se mensagens enviadas pela portaria devem chegar como notificacao push no app morador.
5. Confirmar se `PATCH /messages/{id}/read` deve ser chamado automaticamente quando o operador abre o historico ou manualmente por botao.

