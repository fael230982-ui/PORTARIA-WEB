# Resumo - Controle de Acesso Bio-T / Intelbras

Este arquivo resume a colecao Postman `Controle de Acesso - Bio-T - Intelbras.postman_collection.json`.

## Conclusao rapida

O arquivo e util, mas principalmente para o backend e para o painel de portaria/admin.

O app-morador nao deve chamar esses endpoints diretamente, porque eles apontam para `http://{{device_ip}}/cgi-bin/...`, ou seja, para o equipamento local de controle de acesso. O app deve continuar consumindo apenas a API publica da plataforma V8/Sapinho.

## Grupos encontrados

- QRCode
- Registro de eventos de acesso
- Event Server / Online Mode
- SIP
- Configuracoes de porta
- Usuarios
- Face
- Biometria digital
- Cartao
- Dispositivo

## Endpoints relevantes do equipamento

### Abertura e estado de porta

- `accessControl.cgi?action=openDoor&channel=1`
- `accessControl.cgi?action=openDoor&channel=1&UserID=1&Type=Remote`
- `accessControl.cgi?action=closeDoor&channel=1`
- `accessControl.cgi?action=getDoorStatus&channel=1`
- `accessControl.cgi?action=openDoor&channel=1&Time=10`

Uso recomendado: backend/portaria, nunca app direto.

### Usuarios

- `AccessUser.cgi?action=insertMulti`
- `AccessUser.cgi?action=updateMulti`
- `AccessUser.cgi?action=list`
- `AccessUser.cgi?action=removeMulti`
- `recordFinder.cgi?action=find&name=AccessControlCard`
- `recordUpdater.cgi?action=insert&name=AccessControlCard`
- `recordUpdater.cgi?action=update&name=AccessControlCard`
- `recordUpdater.cgi?action=remove&name=AccessControlCard`

Uso recomendado: sincronizacao backend -> equipamento quando uma pessoa/autorizado for criada, atualizada, expirada ou inativada.

### Face

- `AccessFace.cgi?action=insertMulti`
- `AccessFace.cgi?action=updateMulti`
- `AccessFace.cgi?action=list`
- `AccessFace.cgi?action=removeMulti`
- `FaceInfoManager.cgi?action=add`
- `FaceInfoManager.cgi?action=update`

Uso recomendado: backend receber foto/autorizacao do app ou web, validar permissao, armazenar registro e depois sincronizar com o equipamento.

### Biometria, cartao e QRCode

A colecao tambem traz endpoints para:

- configurar chave/tipo de QRCode;
- cadastrar/remover cartao;
- capturar/cadastrar biometria digital;
- consultar registros de eventos e alarmes.

Uso recomendado: backend/painel administrativo.

## Impacto no app-morador

O app pode se beneficiar desse contrato indiretamente, mas precisa de endpoints seguros no backend.

Funcionalidades futuras possiveis:

- cadastrar visitante/prestador e enviar para integracao facial;
- mostrar status de sincronizacao com equipamento;
- gerar ou exibir QRCode de acesso quando o backend disponibilizar;
- listar historico de acessos da unidade;
- abrir porta remotamente apenas se o backend expuser endpoint seguro, auditado e autorizado;
- exibir eventos de entrada/saida no app.

## Endpoints que o backend deveria expor para o app

Sugestao de camada segura na API publica:

- `POST /api/v1/visit-forecasts`
- `GET /api/v1/visit-forecasts`
- `POST /api/v1/facial/register`
- `GET /api/v1/access-logs?unitId=...`
- `GET /api/v1/access-devices/status`
- `POST /api/v1/access-devices/{id}/open-door`
- `POST /api/v1/access-credentials/qrcode`

Observacao: o app nao deve saber `device_ip`, usuario/senha do equipamento, nem chamar `cgi-bin` diretamente.

## Recomendacao de arquitetura

Fluxo correto:

1. App morador ou painel web chama a API V8.
2. API valida JWT, permissao, unidade selecionada e auditoria.
3. API conversa com o equipamento Intelbras/Bio-T em rede interna.
4. API retorna apenas dados seguros para o app.

Isso evita expor o controle de acesso fisico ao celular do morador.

