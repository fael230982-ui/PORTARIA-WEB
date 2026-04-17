import type { MetadataRoute } from 'next';
import { brandConfig } from '@/config/brand';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brandConfig.appName,
    short_name: brandConfig.appShortName,
    description: brandConfig.appDescription,
    start_url: '/',
    display: 'standalone',
    background_color: brandConfig.metadata.themeColor,
    theme_color: brandConfig.metadata.themeColor,
    icons: [
      {
        src: brandConfig.primaryLogo.src,
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: brandConfig.primaryLogo.src,
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
