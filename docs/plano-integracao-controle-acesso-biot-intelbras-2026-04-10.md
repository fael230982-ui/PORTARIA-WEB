# Plano de integração: Controle de Acesso Bio-T Intelbras

Base analisada em 2026-04-10:
- `docs/Controle de Acesso - Bio-T - Intelbras.postman_collection.json`
- `src/api/API Sapinho V3.5.txt`
- Front atual em `src/app/operacao/page.tsx`

## Leitura técnica

O arquivo enviado é uma coleção Postman para comunicação direta com o equipamento Intelbras/Bio-T por CGI HTTP, usando `device_ip`.

Isso não deve ser consumido diretamente pelo front. O motivo é segurança e arquitetura:
- o front não deve conhecer IP interno, login ou senha do equipamento;
- navegador pode ter bloqueios de rede/CORS;
- abertura de porta e cadastro biométrico exigem auditoria, permissão e log;
- a integração precisa funcionar mesmo com múltiplos condomínios, múltiplas portas e múltiplos dispositivos.

O caminho correto é o backend encapsular o equipamento e expor endpoints próprios para o front.

## Recursos encontrados na coleção Intelbras

### Eventos de acesso

Endpoints do equipamento:
- `GET /cgi-bin/recordFinder.cgi?action=find&name=AccessControlCardRec`
- `GET /cgi-bin/recordFinder.cgi?action=find&name=AccessControlCardRec&StartTime=...`

Uso esperado:
- importar eventos reais de entrada/saída;
- alimentar o histórico recente da tela Operação;
- alimentar último acesso de morador, visitante, prestador e locatário;
- alimentar relatórios.

Status do front:
- já existe consumo de `/api/v1/access-logs`;
- a tela Operação já usa `useAccessLogs`;
- o front já tem tipo `AccessLog` com `personId`, `personName`, `cameraId`, `cameraName`, `direction`, `result`, `classification`, `classificationLabel`, `location`, `message` e `timestamp`.

Contrato que o backend deve manter/fortalecer:
- `GET /api/v1/access-logs`
- filtros: `personId`, `cameraId`, `userId`, `direction`, `result`, `classification`, `page`, `limit`
- resposta com data/hora real do equipamento normalizada em ISO.

Campos recomendados adicionais:
- `deviceId`
- `deviceName`
- `doorId`
- `doorName`
- `rawEventId`
- `authMethod`: `FACE`, `CARD`, `FINGERPRINT`, `PASSWORD`, `REMOTE`, `QRCODE`, `UNKNOWN`
- `photoUrl`, se houver captura associada ao evento
- `unitId` e `unitLabel`, quando o backend conseguir cruzar pessoa/unidade

## Acionamento de porta

Endpoints do equipamento:
- `GET /cgi-bin/accessControl.cgi?action=openDoor&channel=1`
- `GET /cgi-bin/accessControl.cgi?action=openDoor&channel=1&UserID=1&Type=Remote`
- `GET /cgi-bin/accessControl.cgi?action=openDoor&channel=1&Time=10`
- `GET /cgi-bin/accessControl.cgi?action=closeDoor&channel=1`
- `GET /cgi-bin/accessControl.cgi?action=getDoorStatus&channel=1`

Uso esperado no front:
- painel de acionamentos na tela Operação;
- botão grande para abrir portão/porta;
- confirmação obrigatória antes de abrir;
- exibição de status: aberta, fechada, travada, alarme, indisponível;
- log de quem acionou, quando acionou e qual porta foi acionada.

Contrato recomendado para o backend:
- `GET /api/v1/access-control/doors`
- `GET /api/v1/access-control/doors/{doorId}/status`
- `POST /api/v1/access-control/doors/{doorId}/open`
- `POST /api/v1/access-control/doors/{doorId}/close`
- `GET /api/v1/access-control/actions`

Payload recomendado para abrir porta:

```json
{
  "reason": "Entrada autorizada pela portaria",
  "personId": "uuid-opcional",
  "unitId": "uuid-opcional",
  "durationSeconds": 3
}
```

Resposta recomendada:

```json
{
  "id": "uuid-do-comando",
  "doorId": "uuid-da-porta",
  "doorName": "Portão social",
  "status": "EXECUTED",
  "message": "Porta acionada com sucesso.",
  "requestedByUserId": "uuid-do-operador",
  "requestedAt": "2026-04-10T10:30:00-03:00"
}
```

Regras recomendadas:
- somente `ADMIN`, `OPERADOR`, `MASTER` ou perfil autorizado pode acionar;
- exigir confirmação no front para qualquer abertura remota;
- registrar auditoria sempre, inclusive falha;
- impedir duplo clique/acesso repetido por alguns segundos;
- se o backend não conseguir confirmar a abertura, retornar mensagem amigável e status técnico separado.

## Usuários do equipamento

Endpoints do equipamento:
- `POST /cgi-bin/AccessUser.cgi?action=insertMulti`
- `POST /cgi-bin/AccessUser.cgi?action=updateMulti`
- `GET /cgi-bin/AccessUser.cgi?action=list&UserIDList[0]=...`
- `GET /cgi-bin/recordFinder.cgi?action=find&name=AccessControlCard&condition.count=1024`
- `GET /cgi-bin/recordFinder.cgi?action=doSeekFind&name=AccessControlCard&count=4300`

Uso esperado:
- sincronizar moradores, visitantes, prestadores e locatários com o controle físico;
- definir validade de acesso;
- bloquear/inativar pessoa no equipamento quando status mudar no sistema;
- remover acesso quando visitante/prestador vencer.

Contrato recomendado para o backend:
- `POST /api/v1/access-control/people/{personId}/sync`
- `POST /api/v1/access-control/people/{personId}/block`
- `POST /api/v1/access-control/people/{personId}/unblock`
- `DELETE /api/v1/access-control/people/{personId}/credentials/{credentialId}`
- `GET /api/v1/access-control/people/{personId}/credentials`

Campos que o backend deve mapear:
- `personId` do sistema para `UserID` do equipamento;
- `name` para `UserName`;
- período de validade para `ValidFrom` e `ValidTo`;
- portas liberadas para `Doors`;
- zonas de tempo para `TimeSections`;
- status ativo/bloqueado para `UserStatus`.

## Biometria facial

Endpoints do equipamento:
- `POST /cgi-bin/AccessFace.cgi?action=insertMulti`
- `POST /cgi-bin/AccessFace.cgi?action=updateMulti`
- `GET /cgi-bin/AccessFace.cgi?action=list...`
- `GET /cgi-bin/accessControl.cgi?action=captureCmd&type=1&heartbeat=5&timeout=10`
- remoção de face por `UserID`.

Uso esperado:
- cadastrar face do morador/visitante/prestador;
- atualizar biometria;
- remover biometria;
- captura remota pelo equipamento, se suportado.

Contrato recomendado para o backend:
- `POST /api/v1/access-control/people/{personId}/face`
- `PUT /api/v1/access-control/people/{personId}/face`
- `DELETE /api/v1/access-control/people/{personId}/face`
- `POST /api/v1/access-control/devices/{deviceId}/capture-face`

Payload recomendado para cadastro facial:

```json
{
  "photoBase64": "base64-sem-prefixo-data-url",
  "source": "UPLOAD"
}
```

Resposta recomendada:

```json
{
  "personId": "uuid",
  "credentialType": "FACE",
  "status": "SYNCED",
  "message": "Face cadastrada no controle de acesso."
}
```

Observação:
- o front já possui fluxo visual para cadastro e sincronização facial em partes do projeto;
- falta o backend padronizar status de sincronização para o front exibir com segurança.

## Cartão e biometria digital

Endpoints do equipamento:
- `POST /cgi-bin/AccessCard.cgi?action=insertMulti`
- buscar/remover cartão por número;
- `POST /cgi-bin/AccessFingerprint.cgi?action=insertMulti`
- capturar/remover digital.

Uso esperado:
- vincular tag/cartão ao morador/prestador;
- permitir futura biometria digital;
- mostrar no cadastro da pessoa quais credenciais ela possui.

Contrato recomendado para o backend:
- `POST /api/v1/access-control/people/{personId}/cards`
- `DELETE /api/v1/access-control/people/{personId}/cards/{cardNo}`
- `POST /api/v1/access-control/people/{personId}/fingerprints`
- `DELETE /api/v1/access-control/people/{personId}/fingerprints/{fingerprintId}`

## QRCode

A coleção também possui endpoints para configuração de chave e tipo de QRCode no equipamento.

Uso esperado:
- gerar QRCode seguro para visitante, prestador, entregador ou morador;
- permitir validade por período;
- permitir baixa automática após uso, quando aplicável;
- permitir auditoria de quem gerou, para qual unidade e por qual motivo.

Contrato recomendado para o backend:
- `POST /api/v1/access-control/qrcodes`
- `GET /api/v1/access-control/qrcodes`
- `DELETE /api/v1/access-control/qrcodes/{id}`

Payload recomendado:

```json
{
  "personId": "uuid-opcional",
  "unitId": "uuid-da-unidade",
  "validFrom": "2026-04-10T08:00:00-03:00",
  "validTo": "2026-04-10T18:00:00-03:00",
  "maxUses": 1,
  "reason": "Visita autorizada pelo morador"
}
```

Resposta recomendada:

```json
{
  "id": "uuid-do-qrcode",
  "token": "codigo-seguro",
  "qrCodeUrl": "https://api/...",
  "status": "ACTIVE",
  "message": "QRCode gerado com sucesso."
}
```

## Dispositivo e snapshot

Endpoints do equipamento:
- `GET /cgi-bin/snapshot.cgi`
- `GET /cgi-bin/magicBox.cgi?action=getSerialNo`
- `GET /cgi-bin/magicBox.cgi?action=getSystemInfo`
- contadores de faces, cartões, usuários e digitais.

Uso esperado:
- cadastrar equipamento;
- validar se está online;
- mostrar versão/serial;
- usar snapshot no preview de câmera/controle de acesso.

Contrato recomendado para o backend:
- `GET /api/v1/access-control/devices`
- `GET /api/v1/access-control/devices/{deviceId}/status`
- `GET /api/v1/access-control/devices/{deviceId}/snapshot`
- `POST /api/v1/access-control/devices/{deviceId}/sync`

## O que pedir ao backend agora

Prioridade 1:
- Encapsular abertura de porta com `POST /api/v1/access-control/doors/{doorId}/open`.
- Encapsular status de porta com `GET /api/v1/access-control/doors/{doorId}/status`.
- Registrar auditoria de acionamento remoto.

Prioridade 2:
- Importar eventos reais do equipamento para `/api/v1/access-logs`.
- Garantir que cada evento traga `direction`, `result`, `timestamp`, `personName`, `classificationLabel`, `location`, `deviceName` e `doorName`.
- Criar correlação entre `UserID` do equipamento e `personId` do sistema.

Prioridade 3:
- Criar sincronização de pessoa com o equipamento.
- Expor status por pessoa: `synced`, `pending`, `failed`, `notConfigured`.
- Expor credenciais cadastradas: face, cartão, digital, senha.

Prioridade 4:
- Expor dispositivos e portas cadastradas.
- Expor snapshot/status do equipamento.
- Expor permissões por perfil para o front bloquear botões perigosos.

## Impacto no app-morador

O app-morador também não deve consumir `device_ip` nem endpoints `cgi-bin`.

Recursos futuros possíveis para o app, sempre via backend:
- cadastrar visitante/prestador e solicitar sincronização facial;
- exibir status de sincronização com o controle de acesso;
- gerar ou exibir QRCode de acesso;
- listar histórico de acessos da unidade;
- abrir porta remotamente somente se houver endpoint seguro, autorização por perfil/unidade e auditoria;
- exibir eventos de entrada e saída de moradores, visitantes e prestadores.

Endpoints públicos sugeridos para o app:
- `POST /api/v1/visit-forecasts`
- `GET /api/v1/visit-forecasts`
- `POST /api/v1/facial/register`
- `GET /api/v1/access-logs?unitId=...`
- `GET /api/v1/access-devices/status`
- `POST /api/v1/access-devices/{id}/open-door`
- `POST /api/v1/access-credentials/qrcode`

Observação:
- esses nomes podem ser ajustados pelo backend para manter padrão com `/api/v1/access-control/...`;
- o ponto essencial é não expor IP, usuário, senha ou CGI do equipamento para o celular do morador.

## Ajustes que o front poderá fazer depois que o backend entregar

Na tela Operação:
- adicionar painel de acionamentos com portas/portões;
- botão de abertura com confirmação;
- status visual da porta;
- histórico de acionamentos;
- destaque de eventos vindos do equipamento em tempo real.

Em Moradores/Pessoas:
- exibir status de sincronização com controle de acesso;
- exibir credenciais cadastradas;
- ação para sincronizar, bloquear, remover face/cartão/digital;
- indicador de último acesso real vindo do equipamento.

Em Relatórios:
- relatório de acessos permitidos/negados;
- relatório por porta, unidade, pessoa, período e método de autenticação;
- relatório de falhas de sincronização.

## Mensagem objetiva para enviar ao backend

O front não deve consumir a coleção Intelbras diretamente. Precisamos que o backend encapsule a integração Bio-T/Intelbras e exponha endpoints próprios.

Já existe `/api/v1/access-logs` no contrato Sapinho V3.5 e o front já consome esse endpoint na tela Operação. O próximo passo é o backend popular esses logs a partir do equipamento Intelbras e incluir, quando possível: `deviceId`, `deviceName`, `doorId`, `doorName`, `authMethod`, `rawEventId`, `unitId`, `unitLabel` e `photoUrl`.

Para acionamentos, precisamos de:
- `GET /api/v1/access-control/doors`
- `GET /api/v1/access-control/doors/{doorId}/status`
- `POST /api/v1/access-control/doors/{doorId}/open`
- `POST /api/v1/access-control/doors/{doorId}/close`

Para QRCode seguro, precisamos de:
- `POST /api/v1/access-control/qrcodes`
- `GET /api/v1/access-control/qrcodes`
- `DELETE /api/v1/access-control/qrcodes/{id}`

Para sincronização de pessoas/credenciais, precisamos de:
- `POST /api/v1/access-control/people/{personId}/sync`
- `GET /api/v1/access-control/people/{personId}/credentials`
- endpoints para face, cartão e digital conforme disponibilidade do equipamento.

Todos os comandos remotos precisam registrar auditoria e retornar mensagem amigável para o operador.
