# Portaria Web - Resumo de Integracao API Sapinho V4.6

## O que foi absorvido

- integracao do contrato oficial de preferencias de notificacao do morador:
  - `GET /api/v1/resident/notification-preferences`
  - `PUT /api/v1/resident/notification-preferences`
- integracao do contrato oficial de consentimento LGPD do morador por dispositivo:
  - `GET /api/v1/resident/lgpd-consent`
  - `PUT /api/v1/resident/lgpd-consent`
- suporte ao endpoint `GET /api/v1/people/unit-residents` para reduzir erro de destinatario:
  - aplicado em `Admin > Encomendas`
  - aplicado em `Operacao > Registrar encomenda`
- preparacao melhor para reconciliacao offline com `clientRequestId` em criacao de encomendas

## Impacto no produto

- o portal do morador agora consegue consultar e salvar preferencias oficiais de notificacao da unidade ativa
- o portal do morador agora consegue consultar e registrar o aceite LGPD do dispositivo atual
- o cadastro de encomendas ficou mais confiavel ao usar a lista oficial de moradores da unidade quando a API entregar esse dado
- a criacao de encomendas passa a enviar `clientRequestId` automaticamente quando ainda nao houver um id local definido

## Arquivos principais

- `src/types/resident.ts`
- `src/services/resident.service.ts`
- `src/hooks/use-resident.ts`
- `src/app/dashboard/profile/page.tsx`
- `src/services/people.service.ts`
- `src/hooks/use-people.ts`
- `src/app/admin/encomendas/page.tsx`
- `src/app/operacao/page.tsx`
- `src/services/deliveries.service.ts`
- `src/features/offline/client-request-id.ts`
- `src/features/resident/resident-device-id.ts`

## Validacao

- `npm run build` concluido com sucesso em `2026-04-13`
