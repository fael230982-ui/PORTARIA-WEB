# Diagnóstico: grupos de acesso, facial e permissão física

Data: 29/04/2026

## Resumo

O front foi ajustado para trabalhar com grupos de acesso físico no cadastro de pessoas, grupos e dispositivos. A regra principal agora é:

- Pessoa recebe `accessGroupIds`.
- Grupo de acesso vincula pessoas e dispositivos por `personIds` e `deviceIds`.
- Device aceita e retorna `accessGroupIds`.
- Câmeras continuam separadas do controle de acesso físico.

Antes do ajuste, o cadastro de morador enviava unidade, foto e dados pessoais, mas não enviava `accessGroupIds`. Isso permitia salvar foto/face sem garantia de permissão física para abertura.

## Contrato informado pelo backend

`access_groups` agora aceita e retorna:

- `name`
- `deviceIds`
- `personIds`
- `allowedPersonCategories`
- `minAuthorizedAge`
- `minorGuardianAuthorizationRequired`
- `policyNotes`
- `cameraIds`, mantido apenas por compatibilidade

`devices` agora aceita e retorna:

- `accessGroupIds`
- `accessGroupNames`, quando disponível

O sync para Control iD deve validar as regras do device antes de enviar a pessoa ao equipamento. Se a pessoa não pertencer a grupo compatível, ou se não cumprir categoria, idade mínima ou autorização de menor, o backend não deve cadastrar a face no equipamento.

## Ajustes feitos no front

- Tela de grupos de acesso agora permite vincular dispositivos faciais por `deviceIds`.
- Tela de grupos de acesso permite configurar categorias permitidas, idade mínima, exigência de autorização para menor e observações da política.
- Cadastro e edição de device agora permitem selecionar grupos de acesso vinculados ao equipamento.
- Listagem de devices mostra se o equipamento está sem grupo, com IDs de grupo ou com nomes de grupos retornados pela API.
- Cadastro e edição de morador enviam `accessGroupIds` quando selecionados.
- Detalhe do morador mostra bloco de permissão física com grupos, credencial facial, lista facial e item na lista facial.
- Mensagens foram ajustadas para não afirmar acesso liberado quando existe apenas foto/sincronização facial sem grupo.

## Observação de compatibilidade

O front mantém `cameraIds` no payload de grupos apenas por compatibilidade com versões anteriores da API. A regra correta para controle de acesso físico deve usar `deviceIds`, porque:

- Camera = VMS/imagem/stream.
- Device = controle de acesso/acionamento/facial.

## Risco restante

Se não houver grupo de acesso vinculado à pessoa e ao device, a pessoa pode ter foto cadastrada, mas continuar sem permissão para abrir portas no Control iD.

O backend agora deve ser a fonte final da regra: se não existir grupo compatível, deve bloquear a sincronização física ou retornar aviso claro.

## Validação real da API v7.1

Validação executada em 29/04/2026 contra `https://sapinhoprod.v8seguranca.com.br/api/v1`.

Resultado:

- Login admin `admin@v8.com`: OK.
- Login gerente `gerente@v8.com`: OK, role `GERENTE`.
- Login morador `fael230982@gmail.com`: OK, role `MORADOR`.
- `GET /devices` com admin: OK, retornou 2 devices, sendo 1 `FACIAL_DEVICE`.
- `GET /people?limit=5` com admin: OK, retornou pessoas.
- `GET /access-groups` com admin: OK.
- `POST /access-groups` com `deviceIds`, `personIds`, regras e `condominiumId`: OK.
- `GET /access-groups/{id}` retornou `deviceIds`, regras e dados do grupo corretamente.
- `PUT /access-groups/{id}` atualizou regras corretamente.
- `PATCH /devices/{id}` com `accessGroupIds`: OK, retornou `accessGroupIds` e `accessGroupNames`.
- Grupo temporário criado para teste foi removido ao final.

Observação:

- Gerente recebeu 403 em `/devices` e `/access-groups`, compatível com a regra atual de não permitir gerenciamento de infraestrutura para esse perfil.
- Morador recebeu 403 em `/access-groups`, compatível com a regra de não expor administração de grupos ao app morador.
- O front foi corrigido para enviar `condominiumId` ao criar/editar grupos. Sem esse campo, a API aceitava o grupo, mas retornava `condominiumId: null`.

## Validação real do fluxo físico

Validação executada em 29/04/2026 com o device facial:

- Device: `9d850831-c5fb-4c8c-b9e4-889131c3b459`
- Nome: `RAFIELS`
- Host: `192.168.0.129`
- Status retornado pela API: `ONLINE`
- `hasPassword: true`

Foi criado o grupo:

- Nome: `ACESSO GERAL PORTARIA`
- ID: `b3e5e899-972c-462e-889a-ad99262e72af`
- `condominiumId: 93b80cba-106c-4c25-956f-4b7e78984ade`
- Pessoas vinculadas: 2
- Device vinculado: `RAFIELS`
- Categorias permitidas: morador, locatário, visitante, prestador e entregador

Resultado do vínculo:

- `GET /access-groups` retorna o grupo corretamente.
- `PATCH /devices/{id}` com `accessGroupIds` funcionou.
- `GET /devices/{id}` retorna `accessGroupIds` e `accessGroupNames` corretamente.
- `GET /people/{id}` passou a mostrar o novo grupo `ACESSO GERAL PORTARIA`.

Falha encontrada:

- `POST /devices/{device_id}/control-id/people/{person_id}/sync` retornou `500`.
- `POST /integrations/face/people/{person_id}/sync` também retornou `500`.
- A pessoa usada no teste possui `photoUrl`, mas está com:
  - `faceStatus: PHOTO_ONLY`
  - `hasFacialCredential: false`
  - `faceListId: null`
  - `faceListItemId: null`

Inconsistência encontrada:

- `GET /access-groups` retorna apenas os grupos atuais.
- `GET /people/{id}` ainda retorna grupos de teste antigos já removidos:
  - `TESTE FRONT V71 20260429151714`
  - `TESTE FRONT V71 CONDO 20260429151839`

Isso indica vínculo órfão, cache ou serialização de grupos antigos no retorno de pessoa.

Pendência objetiva para o backend:

1. Investigar o `500` nos endpoints de sincronização facial.
2. Confirmar se pessoa com `PHOTO_ONLY` e `photoUrl` deveria ser sincronizável.
3. Limpar ou corrigir vínculos órfãos de grupos removidos no retorno de `GET /people/{id}`.
4. Retornar erro funcional claro quando a sincronização facial não puder prosseguir.
