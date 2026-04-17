# Portaria Web - Pedido detalhado ao Backend apos API Sapinho V4.9

## Contexto

O `Portaria Web` ja absorveu o que a `V4.9` trouxe de mais util no curto prazo:

- politica LGPD oficial do morador
- capacidade oficial do stream
- workflow persistido de alertas
- OCR de encomendas com sugestoes de unidade e destinatario

Mesmo assim, ainda existem fechamentos importantes do lado do backend para liberar o proximo ganho funcional e reduzir compatibilidades temporarias.

## 1. OCR documental para cadastro por webcam/camera

### Objetivo de produto

Permitir que a portaria capture um documento pela:

- webcam
- camera do condominio
- upload manual

e receba OCR estruturado para auto preencher o cadastro da pessoa.

### O que o front ja deixou pronto

- area separada de captura de documento no cadastro de morador
- fluxo de captura por webcam
- fluxo de captura por camera do condominio
- preview do documento antes de salvar

### O que falta no backend

Publicar endpoint oficial de OCR documental.

### Pedido objetivo

Criar endpoint oficial para OCR de documento pessoal, por exemplo:

- `POST /api/v1/people/document-ocr`
ou
- `POST /api/v1/ocr/document`

### Payload desejado

- `photoUrl`
ou
- `photoBase64`
ou
- `file`

### Retorno desejado

- `fullName`
- `documentNumber`
- `documentType`
- `birthDate`
- `issuer`
- `issuedAt`
- `confidence`
- `rawText`
- `normalizedText`
- `nameCandidates`
- `documentCandidates`

### Impacto

Sem isso, o front ja consegue capturar o documento, mas ainda nao consegue auto preencher o cadastro.

## 2. Stream capabilities: fechar semantica operacional consumivel

### Situacao atual

A `V4.9` publicou `GET /api/v1/auth/stream-capabilities`.

### O que falta

Fechar uso pratico disso no ecossistema.

### Pedido objetivo

- documentar payload real completo
- confirmar se esse endpoint e seguro para consumo direto pelo frontend
- documentar significado operacional de:
  - `canonicalTypeField`
  - `canonicalTimeField`
  - `permissionsMatrixPrimary`
  - `effectiveAccessCompanion`
  - `fieldRules`

### Impacto

Sem essa leitura fechada, o endpoint existe, mas o front ainda usa isso mais como referencia do que como arbitro operacional.

## 3. Confirmar precedencia canonica entre workflow e status de alerta

### Situacao atual

O backend ja persiste workflow operacional e o front ja usa:

- `NEW`
- `ON_HOLD`
- `RESOLVED`

### O que falta

Definir a precedencia final entre:

- `workflow.workflowStatus`
- `status`
- `readAt`

### Pedido objetivo

Documentar explicitamente:

- qual campo manda na UI
- se `READ` sempre equivale a `RESOLVED`
- se `workflowStatus` sempre deve prevalecer quando presente

### Impacto

Sem isso, ainda existe margem para interpretacao diferente entre modulos.

## 4. Formalizar abertura operacional do alerta

### Situacao atual

O front registra abertura localmente ao entrar no detalhe da ocorrencia, mas ainda nao esta explicito se o backend quer receber esse momento como evento de negocio.

### Pedido objetivo

Confirmar uma destas duas regras:

1. `openedAt/openedBy*` sao preenchidos automaticamente no primeiro patch de workflow
2. existe endpoint ou payload oficial para marcar abertura separadamente

### Impacto

Sem isso, o horario de abertura continua parcialmente dependente do comportamento local do front.

## 5. OCR de encomendas: score e ordenacao das sugestoes

### Situacao atual

O front ja usa:

- `suggestedUnitId`
- `suggestedResidentId`
- `unitSuggestions`
- `residentSuggestions`

### O que falta

Fechar melhor a regra de uso.

### Pedido objetivo

- documentar se `unitSuggestions` e `residentSuggestions` sempre vem ordenadas por confianca descrescente
- documentar score minimo recomendado para autopreenchimento automatico
- confirmar se `suggested*` sempre corresponde ao item mais confiavel da lista

### Impacto

Sem isso, a UI funciona, mas ainda precisa adotar heuristica propria.

## 6. LGPD policy: confirmar estabilidade de versao legal atual

### Situacao atual

O front agora le `resident/lgpd-policy` para descobrir `currentVersion`.

### Pedido objetivo

- confirmar que `currentVersion` e a referencia oficial para o aceite do dispositivo
- confirmar se essa versao muda por ambiente, cliente ou tenant
- documentar se o aceite anterior deve ser invalido automaticamente quando `currentVersion` mudar

### Impacto

Sem isso, a tela consegue mostrar a politica, mas ainda nao fecha sozinha a regra de reaceite.

## Prioridade recomendada

1. OCR documental para cadastro por webcam/camera
2. precedencia final entre workflow e status de alerta
3. formalizacao do evento de abertura operacional
4. semantica consumivel de `stream-capabilities`
5. regras de score/ordenacao do OCR de encomendas
6. governanca de troca de `currentVersion` na politica LGPD
