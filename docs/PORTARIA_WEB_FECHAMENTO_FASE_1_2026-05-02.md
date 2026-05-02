# Portaria Web - Fechamento Fase 1

Data: 2026-05-02

## Status geral

A Fase 1 está em reta final. O painel já cobre os fluxos principais de operação, administração, cadastros, mensagens, dispositivos, câmeras, grupos de acesso, encomendas, unidades, moradores, usuários, relatórios e alertas.

## Itens validados

- Login e navegação por perfis principais.
- Cadastro e edição de moradores.
- Cadastro e edição de unidades.
- Cadastro e edição de encomendas.
- Cadastro e edição de dispositivos.
- Cadastro e edição de câmeras.
- Cadastro e edição de servidores VMS.
- Cadastro e edição de grupos de acesso.
- Mensagens dos moradores com não lidas priorizadas.
- Mensagem vinculada apenas à unidade abrindo conversa da unidade.
- Monitor externo abrindo manualmente sem manter alerta antigo em foco.
- Vínculo de device com câmeras sendo enviado no payload de `POST/PATCH /devices`.
- Acionamento Control iD validado pelo usuário com funcionamento físico.

## Pendências reais para aceite final

### 1. Câmeras ao vivo no navegador

Status: depende do backend/VMS.

O retorno atual da API para câmera VMS Incoresoft vem como:

```json
{
  "transport": "VMS_NATIVE",
  "liveUrl": "wss://189.51.92.18:60110/vms",
  "hlsUrl": null,
  "webRtcUrl": null,
  "playback": {
    "requiresNativePlayer": true,
    "backendProcessesStream": false,
    "backendProxyFallbackFields": ["imageStreamUrl", "mjpegUrl"]
  }
}
```

Com esse contrato, o navegador só consegue exibir `imageStreamUrl/mjpegUrl`, resultando em preview por frames.

Para fechar ao vivo no painel web, é necessário:

- `hlsUrl` com `.m3u8`; ou
- `webRtcUrl` com contrato completo; ou
- documentação/SDK do player nativo Incoresoft para `wss://.../vms`.

Documento específico:

- `PORTARIA_WEB_PENDENCIA_VMS_AO_VIVO_2026-05-02.md`

### 2. Alertas com snapshot, ao vivo e replay

Status: parcialmente preparado no front, dependente de evidências vindas do backend.

Fluxo esperado:

- O device gera alerta.
- Backend identifica `deviceId`.
- Backend busca `cameraIds` vinculadas ao device.
- Backend gera/anexa snapshot no momento do evento.
- Backend gera/anexa replay do período do evento.
- Front exibe snapshot na tela principal do alerta.
- Front abre o monitor externo automaticamente com as câmeras ao vivo.
- Front exibe botão de replay quando `replayUrl` vier no alerta.

Observação: o front já passou a enviar `cameraIds` no cadastro/edição do device. É necessário retestar um novo alerta real após salvar o vínculo no backend.

### 3. Acionamento Control iD

Status: validado pelo usuário.

Não manter como bloqueio ativo neste momento.

Se o backend quiser aperfeiçoar o retorno, pode fornecer status físico final, mas isso não bloqueia a Fase 1 porque o acionamento foi testado e funcionou.

Retorno ideal futuro:

```json
{
  "ok": true,
  "operation": "remote_open",
  "result": {
    "queued": false,
    "executed": true,
    "confirmed": true,
    "finalStatus": "SUCCEEDED",
    "deviceHttpStatus": 200,
    "deviceMessage": "Ação executada no Control iD"
  }
}
```

## Revisão final de textos e UX

Ainda recomendado antes do aceite:

- Rodada final de acentuação e mensagens amigáveis.
- Conferir se todas as listas críticas aparecem em ordem alfabética.
- Conferir centralização de números em cards/tabelas.
- Conferir mensagens de erro/sucesso dentro do modal quando a ação acontece no modal.
- Conferir se textos técnicos restantes foram removidos ou traduzidos para linguagem operacional.

## Checklist de aceite Fase 1

- Admin acessa dashboard, moradores, unidades, encomendas, câmeras, dispositivos, servidores, grupos, usuários, relatórios e pendências.
- Gerente acessa visão gerencial sem telas técnicas de dispositivos/câmeras/servidores.
- Operador acessa operação, mensagens, busca de unidade, moradores, encomendas, acionamentos e alertas.
- Morador/App conversa com Portaria via backend e mensagens não lidas aparecem primeiro.
- Device Control iD aciona fisicamente.
- Device Control iD vinculado a câmeras persiste `cameraIds` no backend.
- Novo alerta real exibe evidências quando backend retornar `snapshotUrl`/`replayUrl`.
- Monitor externo abre manualmente sem foco de alerta antigo.
- Monitor externo abre automaticamente quando alerta vier com câmeras vinculadas.

## Conclusão

A Fase 1 pode ser considerada próxima do fechamento. O principal bloqueio técnico restante é câmera ao vivo no navegador via VMS Incoresoft. Alertas com snapshot/ao vivo/replay dependem dessa base de streaming e do backend anexar as evidências do evento.

