export type BrandAsset = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export type AppBrandConfig = {
  appName: string;
  appShortName: string;
  appDescription: string;
  ecosystemName: string;
  htmlLang: string;
  primaryLogo: BrandAsset;
  partnerLogo: BrandAsset;
  loginTagline: string;
  topbarEyebrow: string;
  topbarTitle: string;
  developmentLabel: string;
  navigation: {
    activeItemClassName: string;
    inactiveItemClassName: string;
  };
  metadata: {
    title: string;
    description: string;
    themeColor: string;
  };
  theme: {
    primary: string;
    primaryForeground: string;
    ring: string;
  };
};

export const brandConfig: AppBrandConfig = {
  appName: 'Portaria Web',
  appShortName: 'Portaria',
  appDescription: 'Plataforma de acesso, operação e administração condominial',
  ecosystemName: 'Ecossistema Rafiels',
  htmlLang: 'pt-BR',
  primaryLogo: {
    src: '/logo-v8.png',
    alt: 'Logo V8',
    width: 380,
    height: 124,
  },
  partnerLogo: {
    src: '/Logo-Rafiels.png',
    alt: 'Rafiels',
    width: 340,
    height: 136,
  },
  loginTagline: 'Plataforma de acesso, operação e administração condominial',
  topbarEyebrow: 'Centro operacional',
  topbarTitle: 'Plataforma de segurança e operação condominial',
  developmentLabel: 'Desenvolvimento',
  navigation: {
    activeItemClassName: 'app-nav-active',
    inactiveItemClassName: 'app-nav-inactive',
  },
  metadata: {
    title: 'Portaria Web',
    description: 'Plataforma de acesso, operação e administração condominial',
    themeColor: '#0f172a',
  },
  theme: {
    primary: '221.2 83.2% 53.3%',
    primaryForeground: '210 40% 98%',
    ring: '221.2 83.2% 53.3%',
  },
};
