'use client';

type FeatureCardProps = {
  title: string;
  description: string;
  value?: string;
};

export function FeatureCard({ title, description, value }: FeatureCardProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <p className="text-sm text-slate-400">{title}</p>
      {value ? <h3 className="mt-2 text-center text-3xl font-semibold tabular-nums text-white">{value}</h3> : null}
      <p className="mt-2 text-sm text-slate-300">{description}</p>
    </div>
  );
}
