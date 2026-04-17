import Image from 'next/image';
import { brandConfig } from '@/config/brand';

type BrandMarkProps = {
  collapsed?: boolean;
  title?: string;
  subtitle?: string;
  compactSubtitle?: string;
  imageClassName?: string;
};

export function BrandMark({
  collapsed = false,
  title = brandConfig.appShortName,
  subtitle = brandConfig.appDescription,
  compactSubtitle = 'Plataforma do sistema',
  imageClassName = 'h-11 w-auto object-contain',
}: BrandMarkProps) {
  return (
    <div className="flex items-center gap-3 overflow-hidden">
      <Image
        src={brandConfig.primaryLogo.src}
        alt={brandConfig.primaryLogo.alt}
        width={brandConfig.primaryLogo.width}
        height={brandConfig.primaryLogo.height}
        className={imageClassName}
      />

      {!collapsed && (
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-white">{title}</h1>
          <p className="truncate text-xs text-slate-400">{subtitle || compactSubtitle}</p>
        </div>
      )}
    </div>
  );
}
