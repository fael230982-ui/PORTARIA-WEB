import { brandConfig } from '@/config/brand';

export const brandClasses = {
  link: 'text-primary hover:opacity-80',
  outlineAccent: 'border-primary/20 bg-primary/10 text-primary-foreground hover:bg-primary/15',
  solidAccent: 'bg-primary text-primary-foreground hover:opacity-90',
  softAccent: 'border-primary/30 bg-primary/10 text-primary-foreground',
  softAccentMuted: 'border-primary/20 bg-primary/5 ring-2 ring-primary/20',
  softAccentPanel: 'border-primary/20 bg-primary/10',
  accentText: 'text-primary',
  accentTextSoft: 'text-primary/90',
  switchOn: 'bg-primary',
  activeCard: 'border-primary bg-primary/5 ring-2 ring-primary/20',
  activeOverlay: 'bg-primary/10 backdrop-blur-sm',
  activeTab: 'border-primary/40 bg-primary/10 text-white',
  activeChip: 'border-primary/20 bg-primary/10 text-primary-foreground',
  activeButton: 'bg-primary/20 text-primary-foreground hover:bg-primary/25',
};

export function getBrandEyebrowClassName() {
  return brandConfig.theme.primary.includes('221.2') ? 'text-cyan-300' : brandClasses.accentText;
}
