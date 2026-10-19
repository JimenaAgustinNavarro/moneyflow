export const durations = {
  fast: 0.15,
  normal: 0.2,
  slow: 0.3,
} as const;

export const easings = {
  easeOut: [0, 0, 0.2, 1],
  easeInOut: [0.4, 0, 0.2, 1],
} as const;

export const animationVariants = {
  fadeIn: {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0 },
  },
  slideUp: {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0 },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.96 },
    show: { opacity: 1, scale: 1 },
  },
  staggerContainer: {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.08,
      },
    },
  },
  staggerItem: {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0 },
  },
} as const;
