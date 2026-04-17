# Pendencias De Backend Pos API V4.5 - Portaria Web

Data de referencia: `2026-04-13`
Origem: `Portaria Web`

## Objetivo

Consolidar o que ainda depende de fechamento do `Backend` depois da absorcao pratica da `API Sapinho V4.5` no `Portaria Web`, cruzando tambem o que foi registrado por `App Morador` e `Guarita`.

## Leitura Curta

- a `V4.5` trouxe ganho real, especialmente em `renotify` de encomendas;
- o `Portaria Web` ja absorveu a parte util da nova versao sem quebra;
- o principal gap restante agora e de arbitragem de contrato no `Backend`, nao de tela local.

## Pendencias Prioritarias

### 1. Fechar o canonico do stream operacional

O ecossistema ainda convive com dupla leitura entre:

- `type` x `eventType`
- `timestamp` x `occurredAt`

Com a `V4.5`, o stream tambem passou a carregar campos ricos como:

- `entityType`
- `entityId`
- `cameraId`
- `condominiumId`

O `Backend` precisa declarar oficialmente:

- qual campo e canonico para tipo do evento;
- qual campo e canonico para data/hora do evento;
- quais aliases ficam apenas como legado;
- quais campos sao obrigatorios por evento.

### 2. Fechar o contrato final de permissoes

O `Portaria Web` ja normaliza aliases localmente, mas isso ainda e compatibilidade de transicao.

O `Backend` precisa arbitrar:

- se `GET /api/v1/auth/permissions-matrix` ja e a fonte primaria oficial;
- qual formato canonico de permissao vence;
- quais aliases seguem aceitos e por quanto tempo;
- como `scope`, `allowedClients` e `allowedProfiles` entram no contrato oficial.

### 3. Confirmar o escopo oficial de sessao

O ecossistema ainda precisa de fechamento para:

- `scopeType`
- `condominiumIds`
- `unitIds`
- `selectedUnitId`
- `selectedUnitName`
- `requiresUnitSelection`

Isso impacta diretamente:

- login com multiplas unidades;
- filtros operacionais;
- coerencia entre `Portaria Web`, `Guarita` e `App Morador`.

### 4. Fechar a nomenclatura final de encomendas

A `V4.5` melhorou bastante o contrato, mas o ecossistema ainda precisa de arbitragem oficial para:

- `withdrawalCode` x `pickupCode`
- `withdrawalQrCodeUrl` x `qrCodeUrl`
- tabela final de status
- status semantico `READY_FOR_WITHDRAWAL`

O `Portaria Web` ja aceita os nomes novos e antigos, mas ainda precisa dessa decisao para retirar fallback local no futuro.

### 5. Declarar governanca oficial de `deliveries/{id}/renotify`

O `Portaria Web` ja usa `POST /api/v1/deliveries/{id}/renotify` como fluxo principal, mas o `Backend` ainda precisa declarar:

- se o endpoint ja esta estavel em todos os ambientes;
- quem pode usar;
- limites de repeticao;
- janela minima entre reenvios;
- comportamento por perfil e por canal;
- se `notificationSentAt` sempre sera atualizado;
- se o reenvio gera trilha oficial em notificacoes do morador e auditoria operacional.

### 6. Publicar caminho oficial de moradores por unidade

Hoje ainda existe custo operacional desnecessario quando um fluxo precisa selecionar rapidamente um morador da unidade.

O `Backend` deveria publicar um caminho oficial e leve para:

- listar moradores por unidade;
- filtrar por unidade sem exigir paginacao ampla de `/people`;
- reduzir retrabalho nos fluxos de `Encomendas` e rotina operacional.

### 7. Fechar a semantica oficial das visitas previstas V4.5

O ecossistema precisa de confirmacao sobre:

- `PENDING_ARRIVAL`
- `ARRIVED`
- `EXPIRED`
- `CANCELLED`
- `visitForecastId`
- `releaseMode`

O principal ponto aqui e evitar que cada modulo trate historico, no-show e expurgo de forma diferente.

### 8. Persistencia oficial de aceite LGPD

O `Portaria Web` ja tem aceite versionado local, mas ainda depende de rota oficial do `Backend` para:

- leitura do aceite vigente;
- gravacao do aceite;
- `accepted`
- `version`
- `acceptedAt`
- relacao entre aceite, usuario, unidade e dispositivo.

### 9. Fechar preferencias remotas de notificacao

O `Backend` ainda precisa declarar:

- se havera preferencia remota por usuario;
- qual shape oficial vence;
- se a preferencia sera por categoria, canal, som ou prioridade;
- como isso conversa com push e notificacoes internas.

### 10. Fechar o contrato minimo de alertas e cameras

Ainda falta declaracao final e consistente para:

- `alertType`
- `alertSeverity`
- `alertStatus`
- `cameraId`
- `snapshotUrl`
- `replayUrl`
- ordem oficial de prioridade entre `liveUrl`, `hlsUrl`, `webRtcUrl`, `mjpegUrl` e equivalentes.

### 11. Consolidar offline sync e reconciliacao

Mesmo com os avancos locais do `Portaria Web`, seguem pendentes do lado do `Backend`:

- idempotencia por `clientRequestId` ou equivalente;
- endpoint oficial de reconciliacao;
- replay seguro;
- classificacao oficial de erro temporario x erro definitivo;
- regras oficiais de conciliacao quando a rede volta.

## Ordem Recomendada

1. stream operacional
2. permissoes
3. escopo de sessao
4. encomendas
5. `renotify`
6. moradores por unidade
7. visitas previstas V4.5
8. LGPD
9. preferencias de notificacao
10. alertas e cameras
11. offline sync

## Lista Objetiva Para Encaminhamento

1. Declarar o canonico final de `type/eventType` e `timestamp/occurredAt` no stream.
2. Definir a `permissions-matrix` como fonte oficial ou auxiliar, com formato canonico unico.
3. Fechar o contrato oficial de escopo de sessao e selecao de unidade.
4. Oficializar nomenclatura final de codigos, QR e status de encomendas.
5. Declarar uso oficial, limites e auditoria de `deliveries/{id}/renotify`.
6. Publicar caminho oficial de moradores por unidade.
7. Confirmar status, identificador canonico e semantica operacional das visitas previstas da `V4.5`.
8. Publicar contrato oficial para aceite versionado de LGPD.
9. Publicar contrato oficial para preferencias remotas de notificacao.
10. Declarar shape minimo oficial de alertas, cameras, `snapshotUrl` e `replayUrl`.
11. Fechar contrato oficial para sync offline, idempotencia e reconciliacao.

## Observacao Final

Depois da `V4.5`, o `Portaria Web` ficou tecnicamente alinhado no que dependia de implementacao local.

O principal trabalho restante agora e o `Backend` transformar os avancos recentes em contrato arbitral unico para todo o ecossistema.
