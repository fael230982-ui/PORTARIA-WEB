import { brandConfig } from '@/config/brand';

export const LEGAL_VERSION = '2026-04-12';
export const LEGAL_ACCEPTANCE_KEY = `legal-acceptance:${LEGAL_VERSION}`;

export const legalSummaries = {
  privacyTitle: 'Política de Privacidade',
  termsTitle: 'Termo de Uso',
  privacySummary:
    'Este sistema trata dados pessoais para operação condominial, controle de acesso, comunicação, segurança e administração dos serviços contratados.',
  termsSummary:
    'O uso da plataforma depende de autenticação válida, respeito ao escopo do perfil e observância das regras operacionais, de segurança e de proteção de dados.',
};

export const privacySections = [
  {
    title: '1. Dados tratados',
    items: [
      'Dados cadastrais de usuário e morador, como nome, e-mail, telefone e unidade.',
      'Dados operacionais, como acessos, alertas, mensagens, encomendas e logs de uso.',
      'Dados de imagem e evidência, como foto de cadastro, snapshot de câmera e imagem usada em OCR, quando aplicável.',
    ],
  },
  {
    title: '2. Finalidades',
    items: [
      'Controle de acesso e operação condominial.',
      'Comunicação entre portaria, morador e administração.',
      'Segurança patrimonial, auditoria, suporte e prevenção de fraude.',
    ],
  },
  {
    title: '3. Compartilhamento',
    items: [
      `Os dados podem circular entre ${brandConfig.appName}, App Morador, Guarita e Backend conforme a função de cada módulo dentro do ${brandConfig.ecosystemName}.`,
      'O compartilhamento deve respeitar necessidade operacional, perfil de acesso e base legal aplicável.',
    ],
  },
  {
    title: '4. Direitos do titular',
    items: [
      'Solicitar confirmação de tratamento, acesso, correção e revisão de dados, quando aplicável.',
      'Solicitar informações sobre compartilhamento e tratamento de dados pessoais.',
    ],
  },
  {
    title: '5. Segurança e retenção',
    items: [
      'Os acessos devem ser controlados por autenticação, perfil e escopo.',
      'Imagens, logs e evidências devem observar retenção mínima necessária e política interna do controlador.',
    ],
  },
];

export const termsSections = [
  {
    title: '1. Uso autorizado',
    items: [
      'A plataforma deve ser usada apenas por usuário autenticado e autorizado.',
      'Cada perfil deve atuar somente no escopo operacional permitido.',
    ],
  },
  {
    title: '2. Responsabilidade de acesso',
    items: [
      'O usuário é responsável por guardar credenciais e não compartilhar acessos indevidamente.',
      'Ações sensíveis podem ser auditadas para segurança e rastreabilidade.',
    ],
  },
  {
    title: '3. Tratamento de dados e imagem',
    items: [
      'Dados e imagens tratados na plataforma devem estar vinculados à finalidade legítima e operacional.',
      'Não é permitido usar dados, fotos ou evidências fora do fluxo autorizado.',
    ],
  },
  {
    title: '4. Regras de conformidade',
    items: [
      'O uso do sistema pressupõe observância da LGPD, das regras internas do condomínio e das diretrizes do ecossistema.',
      'Fluxos de facial, câmeras, alertas e OCR podem ter requisitos específicos de consentimento e auditoria.',
    ],
  },
];

export function hasAcceptedCurrentLegalVersion() {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(LEGAL_ACCEPTANCE_KEY) === 'accepted';
}

export function acceptCurrentLegalVersion() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LEGAL_ACCEPTANCE_KEY, 'accepted');
}
