import Image from 'next/image';
import { brandConfig } from '@/config/brand';

type BrandPoweredByProps = {
  className?: string;
  imageClassName?: string;
  compact?: boolean;
};

export function BrandPoweredBy({
  className = '',
  imageClassName = 'h-16 w-auto object-contain',
  compact = false,
}: BrandPoweredByProps) {
  const { partnerLogo, developmentLabel } = brandConfig;

  return (
    <div className={className}>
      {!compact ? (
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{developmentLabel}</p>
      ) : null}
      <div className={compact ? '' : 'mt-3 flex justify-center rounded-xl bg-white px-3 py-2 shadow-sm'}>
        <Image
          src={partnerLogo.src}
          alt={partnerLogo.alt}
          width={partnerLogo.width}
          height={partnerLogo.height}
          className={imageClassName}
        />
      </div>
    </div>
  );
}
