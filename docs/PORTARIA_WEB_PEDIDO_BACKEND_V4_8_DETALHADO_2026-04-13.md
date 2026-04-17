# Portaria Web - Pedido detalhado ao Backend apos API Sapinho V4.8

## Fechamentos que deixaram de ser pendencia

Estes pontos nao devem mais constar como abertos:

- `permissions-matrix` como fonte primaria oficial
- `GET /people/unit-residents` como caminho canonico sem locatarios
- arbitragem oficial do workflow operacional de alertas
- consolidacao principal do stream canonico

## Pendencias que ainda valem

### 1. Confirmar resposta canonica de `GET /api/v1/auth/sync-capabilities`

O endpoint novo apareceu na `V4.8`, mas o front ainda precisa de fechamento pratico para usar isso como fonte oficial de decisao.

Pedido:

- documentar payload completo de `sync-capabilities`
- listar flags esperadas por ambiente
- definir quais agregados e fluxos devem ser lidos pelo `Portaria Web`
- confirmar se o endpoint e seguro para consumo direto pelo frontend

### 2. Formalizar leitura do workflow persistido no payload de alerta

O front ja passou a aceitar `workflow` no alerta e a enviar `PATCH /alerts/{id}/workflow`, mas ainda vale fechar o contrato explicito.

Pedido:

- confirmar se `GET /alerts` e `GET /alerts/{id}` sempre devolvem `workflow`
- confirmar precedencia entre:
  - `status`
  - `readAt`
  - `workflow.workflowStatus`
- confirmar se `READ` sempre implica `RESOLVED`

### 3. Fechar se existe atualizacao oficial de workflow para evento "aberto"

Hoje o backend fechou `NEW`, `ON_HOLD` e `RESOLVED`, mas ainda nao esta explicito se o ato de abrir a ocorrencia deve ou nao ser persistido via endpoint proprio ou pelo mesmo patch.

Pedido:

- confirmar se existe patch esperado para registrar abertura
- ou confirmar que `openedAt/openedBy*` sao preenchidos automaticamente no primeiro tratamento

### 4. OCR de encomendas: publicar semantica oficial das sugestoes

O backend agora publica sugestoes melhores, e o front ja consegue aproveitar isso.

Pedido:

- confirmar semantica de:
  - `suggestedUnitId`
  - `suggestedResidentId`
  - `unitSuggestions`
  - `residentSuggestions`
- documentar score minimo recomendado para autopreenchimento
- confirmar se a ordem da lista ja vem por confianca descrescente

### 5. Sync offline: manter documentada a governanca operacional

Boa parte do sync foi fechada, mas o uso operacional no frontend ainda depende de detalhes claros de implantacao.

Pedido:

- manter documentado:
  - `X-Sync-Token`
  - ciclo de expiracao
  - rotacao
  - quais clientes/ambientes recebem o token
- confirmar se `sync-capabilities` tambem informa suporte a:
  - reconcile
  - replay
  - idempotencia por agregado

## Observacao

O documento anterior da `V4.7` fica parcialmente superado por este, porque varios itens ja foram fechados pelo backend depois da emissao original.
