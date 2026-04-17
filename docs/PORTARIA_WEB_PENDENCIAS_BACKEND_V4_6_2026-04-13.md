# Portaria Web - Pendencias Backend apos API Sapinho V4.6

## Fechamentos ainda necessarios

1. reconciliacao offline oficial
- o endpoint `GET /api/v1/internal/sync/reconcile/{client_request_id}` entrou na spec
- ainda falta fechar como o `Portaria Web` deve receber e armazenar o `X-Sync-Token`
- ainda falta definir quais agregados participam da reconciliacao oficial alem de encomendas

2. contrato canonico de sync
- falta definir estados oficiais de `syncStatus`
- falta definir quando `retryable` deve ser `true`
- falta definir quais erros sao finais e quais podem ser reprocessados automaticamente

3. preferencias de notificacao do morador
- a spec hoje trabalha com `channel` e `priority` como strings abertas
- falta fechar enumeracoes oficiais e documentadas para evitar divergencia entre os modulos

4. consentimento LGPD por dispositivo
- o backend passou a expor o consentimento, mas ainda falta alinhar:
  - versao legal canonica do ecossistema
  - regra de revogacao
  - comportamento para troca de unidade ativa
  - auditoria cruzada entre `App Morador`, `Portaria Web`, `Guarita` e `Backend`

5. moradores por unidade
- `GET /api/v1/people/unit-residents` entrou e foi integrado
- ainda falta confirmar se o endpoint sera estavel para todos os perfis e cenarios operacionais
- tambem falta confirmar se ele respeita completamente a unidade ativa do escopo atual

6. persistencia operacional de alertas
- o `Portaria Web` ja trata alerta com resolucao obrigatoria e historico local operacional
- ainda falta um contrato backend para persistir:
  - hora de abertura
  - hora de resolucao
  - quem abriu
  - quem resolveu
  - retorno para fila
  - observacao operacional

## Prioridade sugerida

1. fechar `internal/sync/reconcile` com token e estados oficiais
2. fechar persistencia backend do tratamento operacional de alertas
3. fechar enumeracoes oficiais de `notification-preferences`
4. consolidar governanca LGPD por dispositivo
5. confirmar estabilidade e escopo de `people/unit-residents`
