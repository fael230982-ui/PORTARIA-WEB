'use client';

type SliderProps = {
  value?: number[];
  onValueChange?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
};

export function Slider({
  value = [0],
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  className = '',
  disabled = false,
}: SliderProps) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value[0] ?? 0}
      disabled={disabled}
      onChange={(event) => onValueChange?.([Number(event.target.value)])}
      className={`w-full accent-cyan-500 ${className}`}
    />
  );
}
