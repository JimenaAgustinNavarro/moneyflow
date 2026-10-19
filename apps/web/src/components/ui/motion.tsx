'use client';

import type { ComponentPropsWithoutRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';

import { animationVariants, durations, easings } from '@/lib/animations';

type AnimatedProps = Omit<ComponentPropsWithoutRef<typeof motion.div>, 'transition'> & {
  variant?: keyof typeof animationVariants;
  delay?: number;
  duration?: number;
};

export function Animated({
  children,
  variant = 'fadeIn',
  delay = 0,
  duration = durations.normal,
  className,
  ...props
}: AnimatedProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : 'hidden'}
      animate={shouldReduceMotion ? undefined : 'show'}
      variants={animationVariants[variant]}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : { duration, ease: easings.easeOut, delay }
      }
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
