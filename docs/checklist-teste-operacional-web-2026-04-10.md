# Checklist de teste operacional - Web Portaria

Data: 2026-04-10

## Perfis

### Admin

1. Entrar como admin.
2. Abrir `/admin`.
3. Confirmar cards de moradores, encomendas, cameras e veiculos.
4. Abrir `/admin/pendencias`.
5. Confirmar se aparecem pendencias reais:
   - encomendas 24h/48h;
   - cameras offline;
   - pessoas sem foto;
   - unidades sem morador;
   - veiculos bloqueados/sem unidade.

### Operador

1. Entrar como operador.
2. Abrir `/operacao`.
3. Registrar visitante/prestador.
4. Registrar entrada.
5. Registrar saida.
6. Registrar encomenda pela Operacao.
7. Validar retirada por codigo quando a encomenda tiver codigo/QRCode.
8. Abrir painel de acionamentos.
9. Verificar se actions da API aparecem.

### Morador

1. Entrar como morador da Casa20.
2. Abrir `/dashboard`.
3. Confirmar:
   - 3 encomendas;
   - 1 camera.
4. Abrir `/dashboard/encomendas`.
5. Confirmar chamada equivalente a `GET /api/v1/deliveries?recipientUnitId=<unitId>`.
6. Abrir `/dashboard/cameras`.
7. Confirmar chamada equivalente a `GET /api/v1/cameras?unitId=<unitId>`.

## Fluxos de cadastro

### Unidade

1. Abrir `/admin/unidades`.
2. Criar unidade.
3. Editar unidade.
4. Abrir modal da unidade.
5. Confirmar resumo:
   - pessoas;
   - veiculos;
   - encomendas;
   - cameras;
   - historico recente.

### Usuario

1. Abrir `/admin/usuarios`.
2. Criar usuario morador com senha inicial.
3. Editar apenas nome.
4. Confirmar que senha vazia nao bloqueia salvamento.
5. Abrir "Senha do app".
6. Definir nova senha.
7. Confirmar que e-mail duplicado retorna mensagem clara.

### Encomenda

1. Abrir `/admin/encomendas`.
2. Criar nova encomenda.
3. Filtrar por aguardando retirada.
4. Filtrar por avisadas.
5. Filtrar por retiradas.
6. Filtrar por 24h+.
7. Copiar codigo de retirada.
8. Reenviar aviso.
9. Atualizar status.

### Veiculo

1. Abrir `/admin/veiculos`.
2. Digitar placa antiga `ABC-1234`.
3. Digitar placa Mercosul `ABC1D23`.
4. Confirmar uppercase automatico.
5. Testar placa invalida.
6. Tentar duplicar placa ja cadastrada.
7. Filtrar por bloqueados.
8. Filtrar por placas invalidas, duplicadas e sem unidade.

### Camera

1. Abrir `/admin/cameras`.
2. Filtrar online/offline.
3. Filtrar sem preview.
4. Filtrar RTSP sem conversao.
5. Editar camera.
6. Confirmar aviso de que navegador nao reproduz RTSP direto.

