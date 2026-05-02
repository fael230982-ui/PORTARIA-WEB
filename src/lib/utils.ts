import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function compareTextNatural(left?: string | number | null, right?: string | number | null) {
  return String(left ?? '').localeCompare(String(right ?? ''), 'pt-BR', {
    numeric: true,
    sensitivity: 'base',
  });
}

export function sortByText<T>(items: T[], getValue: (item: T) => string | number | null | undefined) {
  return [...items].sort((left, right) => compareTextNatural(getValue(left), getValue(right)));
}
