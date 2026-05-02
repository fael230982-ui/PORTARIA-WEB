# VMS nativo Incoresoft - ajuste no Portaria Web

Data: 2026-05-02

## Atualizacao aplicada

O Portaria Web foi ajustado para consumir os novos campos retornados pelo backend para cameras Incoresoft/VMS:

- `playback.mode`
- `playback.player`
- `playback.backendProcessesStream`
- `playback.nativePlayerPayload.url`
- `playback.nativePlayerPayload.cameraUuid`
- `playback.nativePlayerPayload.streamUuid`
- `playback.nativeWebSocketProtocol`
- `selectedStreamUuid`
- `cameraUuid`
- `vmsStreamingUrls.internal`
- `vmsStreamingUrls.external`

Tambem foi ajustado o consumo de `GET /api/v1/cameras` para enviar `mediaRoute=external` por padrao.

## Regra no front

O front nao trata mais `/image-stream` como video principal.

`imageStreamUrl` e `mjpegUrl` continuam sendo usados apenas como fallback visual em frames.

Para video principal, o front so usa fontes reproduziveis pelo navegador:

- HLS (`.m3u8`)
- URL HTTP/HTTPS compativel com `<video>`
- outras fontes que o navegador consiga reproduzir diretamente

Quando a API retornar `VMS_NATIVE` com `INCORESOFT_VMS_NATIVE`, o front reconhece e guarda o payload nativo, mas ainda nao renderiza video continuo sem o protocolo/player Incoresoft.

## Estado tecnico atual

O payload nativo recebido e suficiente para identificar:

- URL WebSocket do VMS;
- cameraUuid;
- streamUuid;
- player esperado;
- modo de playback.

Mas WebSocket nativo nao e video HTML. Para transformar isso em imagem ao vivo, ainda e necessario integrar o protocolo/player Incoresoft que faca:

- conexao em `playback.nativePlayerPayload.url`;
- bind no `streamUuid`;
- live no `cameraUuid`;
- decodificacao/renderizacao dos pacotes recebidos.

Sem esse player/protocolo, o comportamento correto do front e exibir fallback por frames e informar que o VMS nativo foi recebido.

## Pendencia objetiva

Para o Portaria Web mostrar ao vivo real com `VMS_NATIVE`, precisamos de uma das opcoes:

1. SDK/player JavaScript oficial ou interno da Incoresoft para `INCORESOFT_VMS_NATIVE`;
2. especificacao do protocolo WebSocket, incluindo mensagens de bind/live e formato dos frames;
3. backend converter o VMS nativo para HLS/WebRTC/browser-compatible.

Enquanto isso, `/image-stream` segue somente como fallback.

## Validacao do SDK informado pelo backend

Foi testado:

```bash
npm view @incoresoft/incoresoft-players@1.0.319-dev.0 version dist-tags --json
```

Resultado:

- `E404 Not Found`
- o pacote nao esta disponivel no registry publico do npm ou exige registry privado.

Portanto, para instalar via pacote, precisamos de uma das opcoes:

- URL do registry privado;
- token de acesso ao registry;
- arquivo `.tgz` do pacote;
- pacote publicado em um registry acessivel pelo projeto.

## Pendencia do player remoto

O backend informou alternativa:

```text
https://IP_DO_VMS:2443/app.js
modulo exposto: ./ISPlayer
```

Para integrar isso no Next/React, ainda falta confirmar:

- URL externa do `app.js` acessivel pelo navegador do operador;
- se o certificado HTTPS e valido ou se o navegador bloqueara por certificado local;
- se `app.js` e ESM, UMD/global ou Module Federation;
- nome do container/global exposto, se for Module Federation;
- assinatura de inicializacao do `ISPlayer`;
- exemplo minimo de uso com:
  - `url`
  - `cameraUuid`
  - `streamUuid`
  - `streamingType`
  - `isPlayback`

Sem essas informacoes, o front consegue reconhecer o payload, mas nao consegue instanciar corretamente o player.

## Solicitacao objetiva para backend/Incore

Enviar um destes caminhos:

1. Pacote instalavel:

```text
@incoresoft/incoresoft-players@1.0.319-dev.0
registry:
token, se necessario:
exemplo de import:
exemplo de componente React:
```

2. Player remoto:

```text
playerScriptUrl:
remoteName/global:
module:
exemplo de inicializacao:
exemplo de destroy/unmount:
```

3. Alternativa de gateway:

```text
hlsUrl ou webRtcUrl browser-compatible para cada camera
```

## Observacao de rede externa

Mesmo com o player correto, o acesso externo depende do NAT informado:

```text
189.51.92.18:60110 -> 192.168.0.160:8080 TCP
```

Se `wss://189.51.92.18:60110/vms` estiver recusando conexao, o player nativo tambem nao conseguira abrir ao vivo fora da rede.
