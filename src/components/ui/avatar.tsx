import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const Avatar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', className)}
      {...props}
    />
  );
});
Avatar.displayName = 'Avatar';

type AvatarImageProps = Omit<
  React.ComponentPropsWithoutRef<typeof Image>,
  'alt' | 'fill' | 'src'
> & {
  alt?: string;
  src?: string;
};

const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, alt, src, ...props }, ref) => {
  if (typeof src !== 'string' || src.length === 0) {
    return null;
  }

  return (
    <Image
      ref={ref}
      src={src}
      alt={alt ?? ''}
      fill
      unoptimized
      sizes="40px"
      className={cn('aspect-square h-full w-full object-cover', className)}
      {...props}
    />
  );
});
AvatarImage.displayName = 'AvatarImage';

const AvatarFallback = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full bg-slate-700 text-slate-100',
        className
      )}
      {...props}
    />
  );
});
AvatarFallback.displayName = 'AvatarFallback';

export { Avatar, AvatarImage, AvatarFallback };
