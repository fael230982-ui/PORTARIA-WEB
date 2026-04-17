# Homologacao Cruzada Do Ecossistema - Portaria Web

Data de referencia: `2026-04-12`
Origem: `Portaria Web`
Base usada:

- `APP_MORADOR_CHECKLIST_HOMOLOGACAO_CRUZADA_ECOSSISTEMA_2026-04-12.md`
- `APP_MORADOR_DECISOES_PENDENTES_DO_ECOSSISTEMA_2026-04-12.md`
- `GUARITA_DIVERGENCIAS_ECOSSISTEMA_2026-04-12.md`

## Resultado da rodada

Status geral:

- `ok com compatibilidade temporaria`

Leitura:

- o `Portaria Web` esta estavel localmente;
- nao ha quebra funcional aberta nesta rodada;
- as principais pendencias atuais dependem de decisao oficial compartilhada e fechamento do `Backend`.

## Checklist resumida

### 1. Sessao e escopo

- `ok com compatibilidade temporaria`
- observacao: o `Portaria Web` respeita `role`, `scopeType`, `unitIds`, `selectedUnitId` e `requiresUnitSelection`, mas a homologacao final depende de comparacao pratica com os demais modulos.

### 2. Permissoes

- `ok com compatibilidade temporaria`
- observacao: o `Portaria Web` normaliza formatos mistos localmente, mas o formato canonico oficial ainda nao foi decidido.

### 3. Encomendas

- `ok com compatibilidade temporaria`
- observacao: o `Portaria Web` mantem compatibilidade com nomes vigentes e alvo, sem assumir `READY_FOR_WITHDRAWAL` nem `withdrawalQrCodeUrl` como contrato final.

### 4. Facial

- `ok com compatibilidade temporaria`
- observacao: `faceStatus`, `faceUpdatedAt` e `faceErrorMessage` ja sao suportados, mas ainda falta o `Backend` declarar em quais rotas esses campos sao obrigatorios.

### 5. Alertas

- `ok com compatibilidade temporaria`
- observacao: o `Portaria Web` usa leitura defensiva local e helper canonico de evidencia, mas ainda falta shape oficial unico de alerta.

### 6. Cameras

- `ok com compatibilidade temporaria`
- observacao: o `Portaria Web` consolidou prioridade local de midia e diagnostico de camera, mas ainda depende de contrato oficial para `snapshotUrl`, `cameraId` e consistencia entre eventos.

### 7. Mensagens e notificacoes

- `ok com compatibilidade temporaria`
- observacao: a separacao semantica local existe, mas ainda depende de orientacao oficial do backend/ecossistema para `message`, `notification` e `alert`.

### 8. Tempo real

- `divergencia aberta`
- observacao: o `Portaria Web` aceita `type/eventType` e `timestamp/occurredAt` por compatibilidade, mas isso ainda nao e contrato canonico fechado.

### 9. Operacao e busca

- `ok com compatibilidade temporaria`
- observacao: `operation/units` ja foi ligado na operacao web, mas o backend ainda precisa estabilizar totalmente o schema para eliminar fallback local.

### 10. Documentacao compartilhada

- `ok sem divergencia`
- observacao: os documentos novos do `Portaria Web` seguem o padrao da raiz de `DES-RAFIELS` com prefixo do modulo.

## Pendencias que seguem abertas

- formato canonico de permissoes;
- status oficial da `permissions-matrix`;
- contrato canonico do stream;
- identificador canonico de visita;
- nomenclatura final de encomendas;
- publicacao estavel de `faceStatus`;
- contrato oficial de alertas e cameras.

## Saida curta da rodada

- `Portaria Web`: ok com compatibilidade temporaria
- `Backend`: pedido de decisao oficial compartilhada
- `Ecossistema`: divergencias abertas ainda sao principalmente de contrato, nao de tela local
