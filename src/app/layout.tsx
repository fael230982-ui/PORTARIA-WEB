import type { Metadata, Viewport } from 'next';
import type { CSSProperties } from 'react';
import './globals.css';
import { Providers } from '@/components/providers';
import { brandConfig } from '@/config/brand';

export const metadata: Metadata = {
  title: brandConfig.metadata.title,
  description: brandConfig.metadata.description,
  icons: {
    icon: brandConfig.primaryLogo.src,
    shortcut: brandConfig.primaryLogo.src,
    apple: brandConfig.primaryLogo.src,
  },
};

export const viewport: Viewport = {
  themeColor: brandConfig.metadata.themeColor,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const brandThemeStyle = {
    '--primary': brandConfig.theme.primary,
    '--primary-foreground': brandConfig.theme.primaryForeground,
    '--ring': brandConfig.theme.ring,
  } as CSSProperties;

  return (
    <html lang={brandConfig.htmlLang}>
      <body style={brandThemeStyle}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
