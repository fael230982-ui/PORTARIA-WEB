# Pendência - Dispositivo facial

Data: 23/04/2026

## Cenário observado

Ao cadastrar um `dispositivo facial`, o sistema informa sucesso no salvamento, porém o item não aparece na lista depois da operação.

## Erro identificado no carregamento

No console do navegador foi registrado:

`GET http://localhost:3000/api/proxy/devices?condominiumId=dbe471a0-970b-4aea-948e-ed5838a0e296 500 (Internal Server Error)`

## Leitura do problema

O comportamento atual indica que:

- o cadastro pode até estar sendo recebido
- mas a tela não consegue recarregar a lista de dispositivos
- o ponto crítico agora está no retorno da listagem

## O que o backend deve verificar

1. Validar o endpoint `GET /api/v1/devices` para o condomínio informado.
2. Confirmar se o novo dispositivo está realmente persistido.
3. Confirmar se `dispositivo facial` está sendo retornado no mesmo contrato da listagem.
4. Verificar se existe filtro por tipo, escopo ou permissão bloqueando o item recém-criado.
5. Retornar erro tipado, para o front mostrar mensagem amigável quando a listagem falhar.
