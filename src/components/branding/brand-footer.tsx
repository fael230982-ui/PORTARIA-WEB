import { BrandPoweredBy } from '@/components/branding/brand-powered-by';

type BrandFooterProps = {
  collapsed?: boolean;
};

export function BrandFooter({ collapsed = false }: BrandFooterProps) {
  if (collapsed) {
    return (
      <div className="mt-4 flex justify-center">
        <div className="rounded-xl bg-white p-1.5 shadow-sm">
          <BrandPoweredBy compact imageClassName="h-12 w-12 rounded-lg object-contain" />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl bg-white/5 px-3 py-4 text-center">
      <BrandPoweredBy imageClassName="h-16 w-auto object-contain" />
    </div>
  );
}
