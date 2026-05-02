# Pendência VMS ao vivo no navegador

Data: 2026-05-02

## Contexto

O painel Portaria Web já tenta reproduzir a câmera usando, nesta ordem:

- `preferredLiveUrl`
- `liveUrl`
- `hlsUrl`
- `vmsStreamingUrls.external`
- `vmsStreamingUrl`
- `streamUrl`

O front não faz `HEAD` nem pré-validação bloqueante antes de passar a URL ao player.

## Retorno real validado

Endpoint testado:

```http
GET /api/v1/cameras/b64c5018-47e5-42e3-902e-7d56589d690e/streaming?mediaRoute=external
```

Retorno relevante:

```json
{
  "provider": "VMS",
  "transport": "VMS_NATIVE",
  "liveUrl": "wss://189.51.92.18:60110/vms",
  "hlsUrl": null,
  "webRtcUrl": null,
  "preferredLiveUrl": "wss://189.51.92.18:60110/vms",
  "playback": {
    "mode": "VMS_NATIVE",
    "requiresNativePlayer": true,
    "backendProcessesStream": false,
    "backendProxyFallbackFields": ["imageStreamUrl", "mjpegUrl"]
  },
  "imageStreamUrl": "/api/v1/cameras/b64c5018-47e5-42e3-902e-7d56589d690e/image-stream",
  "mjpegUrl": "/api/v1/cameras/b64c5018-47e5-42e3-902e-7d56589d690e/image-stream"
}
```

## Diagnóstico

Com esse contrato, o navegador não recebe uma fonte padrão reproduzível de vídeo ao vivo.

O `wss://.../vms` é marcado como `VMS_NATIVE` e `requiresNativePlayer: true`. Sem documentação/protocolo do player nativo Incoresoft no front, o painel cai corretamente para `imageStreamUrl/mjpegUrl`, resultando em preview por frames.

## Necessário para resolver

Para a câmera ficar ao vivo no painel web sem depender de player proprietário, o backend precisa entregar pelo menos um destes campos com URL reproduzível no navegador:

- `hlsUrl` com `.m3u8`
- `liveUrl` apontando para HLS ou outro vídeo HTTP reproduzível
- `webRtcUrl` com contrato completo de conexão WebRTC

Alternativa: documentar e fornecer SDK/contrato do player `INCORESOFT_VMS_NATIVE` para o front consumir `wss://.../vms`.

## Estado no front

O front está preparado para:

- HLS nativo do navegador.
- HLS via `hls.js`.
- Fallback para `imageStreamUrl/mjpegUrl`.
- Exibir aviso quando a API retornar apenas `VMS_NATIVE` sem HLS/WebRTC.

