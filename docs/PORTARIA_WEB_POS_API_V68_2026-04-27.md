# Portaria Web - Analise Pos API V6.8 - 2026-04-27

## Objetivo

Registrar o impacto util da `API Sapinho V6.8` no modulo `Portaria Web`, mantendo alinhamento com `Guarita` e `App Morador`.

## Arquivos revisados

- `C:\Users\Pc Rafa\Desktop\DES-RAFIELS\API\API Sapinho V6.8.txt`
- `C:\Users\Pc Rafa\Desktop\guarita\GUARITA_POS_API_V6_5_2026-04-27.md`
- `C:\Users\Pc Rafa\Desktop\app-morador\docs\RELATORIO_POS_API_V6_5_2026-04-27.md`

## Leitura objetiva da V6.8

O ganho pratico da `V6.8` para o `Portaria Web` foi a formalizacao do update parcial de dispositivo:

- `PATCH /api/v1/devices/{id}`

Segundo o backend:

- o endpoint atualiza o `device` sem mexer na `camera`
- mantem persistencia de `remoteAccessConfig`
- registra `device.updated` em sync/auditoria
- o `405 Method Not Allowed` anterior foi resolvido

## Impacto no Portaria Web

O front ja tinha estrutura para editar:

- credenciais do dispositivo
- `remoteAccessConfig`
- nomes dos acionamentos
- ativa/desativa dos acionamentos

O ajuste necessario nesta rodada foi trocar o fluxo principal de update para `PATCH`.

## Ajuste aplicado no front

Arquivo alterado:

- `src/services/devices.service.ts`

Mudanca:

- `devicesService.update()` agora usa `PATCH /devices/{id}` como caminho principal
- `PUT /devices/{id}` fica apenas como compatibilidade para ambiente antigo que ainda nao tenha a `V6.8`

## Conclusao pos-V6.8

Para o `Portaria Web`, a `V6.8` nao exigiu refatoracao ampla.

O delta realmente util foi:

1. remover a dependencia do `PUT` como fluxo principal de edicao de dispositivo
2. alinhar a edicao de `Device` com o contrato oficial novo do backend

## Proxima acao recomendada

Validar funcionalmente no `Admin > Dispositivos`:

1. editar um `FACIAL_DEVICE`
2. salvar host, usuario, senha e `remoteAccessConfig`
3. confirmar persistencia na recarga da listagem
4. confirmar que a `Operacao` consome o `device` atualizado para os acionamentos
