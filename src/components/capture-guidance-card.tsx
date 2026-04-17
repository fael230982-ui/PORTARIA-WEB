type CaptureGuidanceCardProps = {
  title: string;
  description: string;
  tips: string[];
  footer?: string;
};

export function CaptureGuidanceCard({
  title,
  description,
  tips,
  footer,
}: CaptureGuidanceCardProps) {
  return (
    <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm text-cyan-50">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-cyan-100/80">{description}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {tips.map((tip) => (
          <div
            key={tip}
            className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs text-cyan-50"
          >
            {tip}
          </div>
        ))}
      </div>
      {footer ? (
        <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/35 px-3 py-3 text-xs text-cyan-100/80">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
