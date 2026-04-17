import { brandConfig } from '@/config/brand';

export const LEGAL_VERSION = '2026-04-12';
export const LEGAL_ACCEPTANCE_KEY = `legal-acceptance:${LEGAL_VERSION}`;

export const legalSummaries = {
  privacyTitle: 'Politica de Privacidade',
  termsTitle: 'Termo de Uso',
  privacySummary:
    'Este sistema trata dados pessoais para operacao condominial, controle de acesso, comunicacao, seguranca e administracao dos servicos contratados.',
  termsSummary:
    'O uso da plataforma depende de autenticacao valida, respeito ao escopo do perfil e observancia das regras operacionais, de seguranca e de protecao de dados.',
};

export const privacySections = [
  {
    title: '1. Dados tratados',
    items: [
      'Dados cadastrais de usuario e morador, como nome, e-mail, telefone e unidade.',
      'Dados operacionais, como acessos, alertas, mensagens, encomendas e logs de uso.',
      'Dados de imagem e evidencia, como foto de cadastro, snapshot de camera e imagem usada em OCR, quando aplicavel.',
    ],
  },
  {
    title: '2. Finalidades',
    items: [
      'Controle de acesso e operacao condominial.',
      'Comunicacao entre portaria, morador e administracao.',
      'Seguranca patrimonial, auditoria, suporte e prevencao de fraude.',
    ],
  },
  {
    title: '3. Compartilhamento',
    items: [
      `Os dados podem circular entre ${brandConfig.appName}, App Morador, Guarita e Backend conforme a funcao de cada modulo dentro do ${brandConfig.ecosystemName}.`,
      'O compartilhamento deve respeitar necessidade operacional, perfil de acesso e base legal aplicavel.',
    ],
  },
  {
    title: '4. Direitos do titular',
    items: [
      'Solicitar confirmacao de tratamento, acesso, correcao e revisao de dados, quando aplicavel.',
      'Solicitar informacoes sobre compartilhamento e tratamento de dados pessoais.',
    ],
  },
  {
    title: '5. Seguranca e retencao',
    items: [
      'Os acessos devem ser controlados por autenticacao, perfil e escopo.',
      'Imagens, logs e evidencias devem observar retencao minima necessaria e politica interna do controlador.',
    ],
  },
];

export const termsSections = [
  {
    title: '1. Uso autorizado',
    items: [
      'A plataforma deve ser usada apenas por usuario autenticado e autorizado.',
      'Cada perfil deve atuar somente no escopo operacional permitido.',
    ],
  },
  {
    title: '2. Responsabilidade de acesso',
    items: [
      'O usuario e responsavel por guardar credenciais e nao compartilhar acessos indevidamente.',
      'Acoes sensiveis podem ser auditadas para seguranca e rastreabilidade.',
    ],
  },
  {
    title: '3. Tratamento de dados e imagem',
    items: [
      'Dados e imagens tratados na plataforma devem estar vinculados a finalidade legitima e operacional.',
      'Nao e permitido usar dados, fotos, snapshots ou evidencias fora do fluxo autorizado.',
    ],
  },
  {
    title: '4. Regras de conformidade',
    items: [
      'O uso do sistema pressupoe observancia da LGPD, das regras internas do condominio e das diretrizes do ecossistema.',
      'Fluxos de facial, cameras, alertas e OCR podem ter requisitos especificos de consentimento e auditoria.',
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
