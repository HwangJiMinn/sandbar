import { mergeProps, useRender } from '@base-ui/react';
import { Button as BaseButton } from '@base-ui/react/button';
import clsx from 'clsx';
import { useRef } from 'react';

export interface ButtonProps extends useRender.ComponentProps<typeof BaseButton> {
  variant?: 'primary' | 'secondary' | 'outline';
}

export const Button = ({
  render = <BaseButton />,
  variant = 'primary',
  ...props
}: ButtonProps) => {
  const internalRef = useRef<HTMLButtonElement | null>(null);

  const className = clsx('h-10 rounded-md px-4', {
    'bg-primary text-primary-foreground hover:bg-primary/90': variant === 'primary',
    'bg-secondary text-secondary-foreground hover:bg-secondary/70':
      variant === 'secondary',
    'border border-foreground text-foreground hover:bg-foreground/5':
      variant === 'outline',
  });

  const element = useRender({
    render,
    ref: internalRef,
    props: mergeProps({ className }, props),
  });

  return element;
};
