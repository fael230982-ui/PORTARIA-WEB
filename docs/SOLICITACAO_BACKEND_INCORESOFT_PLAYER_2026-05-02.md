# Solicitacao ao backend/Incore - Player Incoresoft VMS Native

Data: 2026-05-02

## Contexto

O Portaria Web ja consome e normaliza o payload:

```json
{
  "mode": "VMS_NATIVE",
  "player": "INCORESOFT_VMS_NATIVE",
  "backendProcessesStream": false,
  "nativePlayerPayload": {
    "url": "wss://189.51.92.18:60110/vms",
    "cameraUuid": "UUID_DA_CAMERA_NO_VMS",
    "streamUuid": "UUID_DO_STREAM",
    "streamingType": "live",
    "isPlayback": false
  }
}
```

O front tambem ja trata `/image-stream` e `mjpegUrl` apenas como fallback em frames.

## Bloqueio atual

O pacote informado:

```text
@incoresoft/incoresoft-players@1.0.319-dev.0
```

foi consultado no npm publico e retornou:

```text
E404 Not Found
```

Ou seja, ele nao esta acessivel publicamente ou precisa de registry/token privado.

## O que precisamos receber

### Opcao 1 - Pacote npm/registry

Enviar:

- registry privado;
- token de acesso, se necessario;
- comando exato de instalacao;
- exemplo minimo de import;
- exemplo minimo React para montar/desmontar o player;
- tipos ou documentacao dos parametros.

Exemplo esperado:

```ts
import { ISPlayer } from '@incoresoft/incoresoft-players';

const player = new ISPlayer(container, {
  url,
  cameraUuid,
  streamUuid,
  streamingType: 'live',
  isPlayback: false,
});

player.destroy();
```

### Opcao 2 - Player remoto do VMS

Foi informado:

```text
https://IP_DO_VMS:2443/app.js
modulo exposto: ./ISPlayer
```

Precisamos confirmar:

- URL externa do `app.js` acessivel pelo navegador;
- se o certificado HTTPS e valido;
- se o script e ESM, UMD/global ou Module Federation;
- nome do global/container;
- assinatura de inicializacao;
- assinatura de destroy/unmount;
- exemplo HTML/JS minimo funcionando.

### Opcao 3 - Gateway browser-compatible

Se nao houver SDK/player web acessivel, a alternativa mais estavel e o backend/media gateway devolver:

- `hlsUrl` com `.m3u8`; ou
- `webRtcUrl` browser-compatible; ou
- outra URL reproduzivel diretamente pelo navegador.

## Rede externa

Mesmo com player correto, o acesso externo depende do NAT:

```text
189.51.92.18:60110 -> 192.168.0.160:8080 TCP
```

Se `wss://189.51.92.18:60110/vms` continuar recusando conexao, o player nativo nao funcionara fora da rede.
