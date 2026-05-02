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
