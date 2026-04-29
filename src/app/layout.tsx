import type { Metadata, Viewport } from 'next';
import './globals.css';
import { UppercaseInputGuard } from '@/components/forms/uppercase-input-guard';
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
  return (
    <html lang={brandConfig.htmlLang} className="dark" suppressHydrationWarning>
      <body>
        <Providers>
          <UppercaseInputGuard />
          {children}
        </Providers>
      </body>
    </html>
  );
}
