# Pedido Backend V4.4 Gap

Data: 2026-04-12
Origem: Portaria Web
Base analisada: `src/api/API Sapinho V4.4.txt`

## Resumo executivo

O `Portaria Web` ja opera com a `V4.4`, mas ainda existem pendencias do backend para fechar integracao real, eliminar fallback e padronizar o contrato do ecossistema.

## Pendencias prioritarias

### 1. Fechar contratos ainda tipados de forma generica

Impacto:
Sem shape estavel, o front consegue consumir parcialmente, mas nao consegue depender desses endpoints como contrato oficial de produto.

Pontos:

- `GET /api/v1/ops/metrics`
  - na spec atual o `200` ainda aparece com schema `{}`.
  - necessario publicar resposta tipada e estavel.

- `POST /api/v1/events/stream/confirm`
  - request ja tem shape util.
  - response ainda retorna `device` como `object` generico.
  - necessario tipar o objeto `device` com campos reais esperados.

### 2. Consolidar fluxo oficial do stream operacional

Impacto:
O front ja aceita o shape novo de `events/stream`, mas ainda nao consegue fechar o ciclo completo de confirmacao e auditoria.

Pontos:

- confirmar se `POST /api/v1/events/stream/confirm` sera obrigatorio em producao;
- documentar quando confirmar, com que frequencia e em quais eventos;
- estabilizar a semantica de `connectionId`, `deviceId`, `deviceName`, `currentPath` e `metadata`;
- publicar exemplos de payload reais para homologacao.

### 3. Estabilizar heartbeat e monitoramento de devices em todos os ambientes

Impacto:
O `Portaria Web` ja envia heartbeat e consome monitoramento, mas ainda existem ambientes onde o endpoint responde `404` ou nao devolve o contrato completo.

Pontos:

- garantir disponibilidade de `POST /api/v1/operation/devices/heartbeat`;
- garantir disponibilidade estavel de `GET /api/v1/master/operation-devices`;
- manter `lastHeartbeatDelaySeconds`, `status`, `lastSeenAt`, `currentPath`, `userName` e `clientVersion` de forma consistente.

### 4. Consolidar busca oficial de unidades na operacao

Impacto:
A busca oficial de `GET /api/v1/operation/units` ja foi ligada na tela operacional, mas precisa ficar estavel para substituir completamente o fallback local.

Pontos:

- garantir retorno consistente de `id`, `label`, `condominiumId` e `condominiumName`;
- confirmar comportamento por perfil e escopo;
- documentar se a busca aceita IDs legados, nomes parciais, bloco/apto e referencia curta de unidade.

### 5. Fechar nomenclatura e cobertura dos contratos do ecossistema

Impacto:
Ainda existem pontos em que backend, front web, app morador e guarita podem divergir se a nomenclatura nao for consolidada de forma canonica.

Pontos:

- manter `qrCodeUrl` como nome vigente e formalizar se `withdrawalQrCodeUrl` sera apenas alvo ou novo padrao oficial;
- confirmar se `READY_FOR_WITHDRAWAL` sera adotado como status oficial ou apenas alias de transicao;
- publicar orientacao oficial para `message`, `notification` e `alert` conforme o contrato compartilhado;
- fechar campos de permissao e escopo que ainda variam entre implementacoes locais.

## Pendencias secundarias

- publicar exemplos reais de `permissions-matrix` por perfil para homologacao cruzada;
- confirmar se `metrics` do master sao sempre obrigatorias em todos os clientes;
- revisar exemplos da spec com encoding quebrado, para evitar ambiguidade entre times.

## Recomendacao de ordem

1. tipar corretamente `ops/metrics` e `events/stream/confirm`
2. estabilizar heartbeat e monitoramento
3. consolidar `operation/units`
4. formalizar nomenclatura e status do ecossistema
5. complementar exemplos e documentacao operacional

## Observacao final

Este pedido deve ter copia compartilhada em `C:\Users\Pc Rafa\Desktop\DES-RAFIELS`, mas o original desta frente permanece em `my-app/docs`.
