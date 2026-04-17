# Pendencias De Backend Para Offline E Sync - Portaria Web

Data de referencia: `2026-04-12`
Origem: `Portaria Web`

## Contexto

O `Portaria Web` ja passou a operar com:

- fila local de operacoes criticas;
- snapshot local de leitura em telas principais;
- sincronizacao automatica quando a rede volta;
- modos degradados em `Operacao`, `Admin > Encomendas`, `Admin > Moradores` e `Admin > Unidades`.

Isso reduz parada operacional, mas ainda depende de fechamento do `Backend` para reconciliacao forte e integridade completa.

## Pendencias Prioritarias

### 1. Idempotencia oficial por operacao

O backend precisa aceitar um `clientRequestId` ou campo equivalente nas operacoes mutaveis para evitar duplicidade quando houver replay da fila offline.

Aplica especialmente a:

- cadastro de pessoa;
- atualizacao de pessoa;
- mudanca de status de pessoa;
- criacao de encomenda;
- atualizacao de status de encomenda;
- mensagens operacionais;
- ocorrencias e relatorios;
- troca de turno.

### 2. Endpoint oficial de conciliacao

O ecossistema precisa de um endpoint de reconciliacao para dizer quais itens locais ja foram persistidos no backend e quais ainda precisam de reenvio.

Saidas desejadas:

- `persistido`
- `duplicado`
- `conflito`
- `rejeitado`

### 3. Contrato estavel para replay

Os endpoints mutaveis precisam responder com shape previsivel quando receberem reenvio de operacao ja persistida.

Hoje o frontend consegue reenfileirar e reenviar, mas ainda depende de comportamento consistente para decidir:

- remover da fila;
- manter pendente;
- marcar como falha definitiva.

### 4. Sincronizacao de retirada segura

Validacao por codigo/QR de retirada nao deve operar como sucesso offline. O backend precisa definir um fluxo canônico para:

- confirmacao segura quando a rede voltar;
- tratamento de tentativas expiradas;
- diferenciacao entre codigo invalido e indisponibilidade temporaria.

### 5. Registro de aceite LGPD no backend

O frontend ja possui aceite versionado local, mas o backend ainda precisa:

- persistir a versao aceita por usuario;
- expor isso por API;
- permitir auditoria por data e versao.

### 6. Heartbeat e health check mais utilizaveis

Para o modo degradado e monitoramento operacional, o backend precisa consolidar melhor:

- heartbeat de dispositivo;
- ultima sincronizacao relevante;
- status de servicos criticos;
- diferenca entre indisponibilidade parcial e total.

## Requisitos Desejados De Contrato

- `clientRequestId` ou equivalente em toda escrita critica.
- resposta idempotente para replay seguro.
- endpoint de conciliacao offline.
- classificacao de erro temporal versus erro definitivo.
- metadado de origem (`web-operation`, `web-admin-deliveries`, etc.).
- timestamps consistentes para auditoria cruzada.

## Leitura Objetiva

- o `Portaria Web` ja consegue continuar operando melhor sem internet;
- o proximo salto de robustez depende do `Backend`;
- sem esses fechamentos, o modo offline continua util, mas ainda com reconciliacao defensiva e parcial.
