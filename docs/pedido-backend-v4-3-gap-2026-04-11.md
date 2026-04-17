# Pendencias de backend apos integracao da API Sapinho V4.3

Data: `2026-04-11`

Fonte local analisada: `src/api/API Sapinho V4.3.txt`

## Resumo

A base web ja consome os principais endpoints da `V4.3`, mas ainda ha gaps de backend para concluir a experiencia operacional e reduzir fallback/heuristica no front.

## Pendencias objetivas

### 1. `GET /api/v1/master/clients` e `POST /api/v1/master/clients` ainda estao com `schema: {}`

Hoje a documentacao desses endpoints nao tipa claramente a resposta de sucesso.

Impacto:
- o front ainda precisa normalizar retorno de forma defensiva;
- qualquer mudanca de shape pode quebrar sem aviso em runtime.

Necessidade:
- retornar schema explicito equivalente a `PublicCondominiumResponse[]` na listagem;
- retornar schema explicito equivalente a `PublicCondominiumResponse` na criacao.

### 2. `PATCH /api/v1/master/licenses/{client_id}` e `PATCH /api/v1/master/clients/{client_id}/modules` tambem respondem com `schema: {}`

Impacto:
- o front consegue chamar, mas ainda trata a resposta como parcial e normaliza no cliente;
- reduz confiabilidade de tipagem no fluxo master.

Necessidade:
- documentar resposta real desses patches com contrato fechado.

### 3. `GET /api/v1/operation/units` ainda nao foi absorvido no produto porque falta confianca no shape operacional completo

O endpoint existe na `V4.3`, mas o front ainda depende principalmente do catalogo de unidades local.

Necessidade:
- manter retorno estavel para busca operacional, com pelo menos:
  - `id`
  - `label`
  - `condominiumId`
  - `condominiumName`
  - opcionalmente `unitLabel`, `structureLabel`, `legacyUnitId`

Impacto desejado:
- usar autocomplete oficial para cadastro rapido de visitantes e encomendas na operacao.

### 4. Fluxo de OCR de encomenda precisa ficar operacional em producao

O front ja integra:
- `POST /api/v1/deliveries/ocr`
- `POST /api/v1/deliveries/photo/upload`

Pendencias de backend:
- garantir disponibilidade no ambiente real;
- manter latencia e taxa de erro aceitaveis;
- retornar OCR util para preenchimento automatico com boa qualidade.

Campos importantes ja usados pelo front:
- `deliveryCompany`
- `trackingCode`
- `recipientName`
- `unitHint`
- `confidence`
- `rawText`

### 5. Falta fechar a associacao automatica de OCR com unidade/pessoa

A `V4.3` retorna `unitHint` e `recipientName`, mas ainda nao existe endpoint fechado que transforme isso em correspondencia confiavel de unidade/pessoa para a guarita.

Necessidade sugerida:
- endpoint de sugestao estruturada baseado em OCR e contexto do condominio;
- ou enriquecer `POST /api/v1/deliveries/ocr` com candidatos de unidade/pessoa.

### 6. `GET /api/v1/events/stream` e `POST /api/v1/events/stream/confirm` continuam sem integracao pratica fechada

O produto ainda nao usa esse fluxo de ponta a ponta.

Gap de backend a resolver:
- contrato real do stream;
- formato do evento;
- estrategia de autenticacao;
- quando e como usar `confirm`.

Impacto:
- sem isso, notificacao operacional em tempo real continua dependente de polling e heuristica local.

### 7. Historico de troca de turno ainda precisa de consolidacao mais rica no backend

O front ja grava e consulta:
- `POST /api/v1/operation/shift-change`
- `GET /api/v1/operation/shift-changes`

Gap atual:
- o contrato ainda nao contempla um resumo operacional consolidado por turno com métricas prontas para auditoria.

Necessidade sugerida:
- incluir no retorno do historico:
  - resumo numerico do turno;
  - operador de entrada/saida;
  - status do device;
  - vinculacao de condominio/unidade operacional;
  - filtros por data e por condominio.

### 8. Monitoramento master por device ainda pode evoluir

`GET /api/v1/master/operation-devices` ja existe e foi integrado.

Melhorias desejadas no backend:
- filtro por `status`;
- filtro por `condominiumId`;
- paginação;
- indicador de device principal/reserva;
- `lastHeartbeatDelaySeconds` ou equivalente para nao depender de calculo no front.

### 9. Falta resposta mais rica para o contrato de modulos por cliente

`GET /api/v1/master/modules/catalog` ja ajuda, mas ainda faltam metadados para produto.

Melhorias desejadas:
- modulo obrigatorio ou opcional;
- dependencia entre modulos;
- modulo visivel mas nao persistivel;
- mensagem amigavel para modulo fora de cobertura.

### 10. Persistencia de alguns modulos ainda depende de expansao de catalogo/regra de negocio

Mesmo com avancos da `V4.3`, a UX do produto ainda tem itens planejados que nao estao totalmente refletidos como contrato backend por cliente.

Itens que ainda merecem fechamento formal:
- relatorios
- acionamentos
- app morador
- app guarita

Necessidade:
- decidir se entram como modulos oficiais persistidos na API;
- ou se permanecem somente como composicao de recursos.

## Prioridade recomendada

1. Tipar corretamente respostas de `master/clients`, `master/licenses` e `master/.../modules`.
2. Garantir estabilidade produtiva de `deliveries/ocr` e `deliveries/photo/upload`.
3. Fechar contrato de `operation/units` para autocomplete oficial.
4. Fechar contrato real de `events/stream` e `events/stream/confirm`.
5. Enriquecer `shift-changes` e `operation-devices` para auditoria/monitoramento.
