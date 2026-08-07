import React from 'react';
import { motion, AnimatePresence, HTMLMotionProps, useReducedMotion } from 'motion/react';
import { DESIGN_TOKENS } from '../../theme/themeConfig';

// Extract curves and physics from tokens
const { curves } = DESIGN_TOKENS.animations;

export const whatsappEase = curves.whatsappEase;
export const whatsappSpring = curves.springPhysics;

interface AnimatedProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  layout?: boolean | 'position' | 'size';
}

/**
 * Helper to adjust transitions globally when reduced motion is preferred.
 */
export const useTransitionConfig = (
  customTransition: any, 
  durationInSeconds = 0.22,
  delayInSeconds = 0
) => {
  const prefersReduced = useReducedMotion();
  
  if (prefersReduced) {
    return {
      duration: 0.05,
      ease: 'linear',
      delay: 0,
    };
  }

  return {
    ...customTransition,
    delay: delayInSeconds,
  };
};

/**
 * Reusable Accessible FadeIn Component
 */
export const FadeIn: React.FC<AnimatedProps> = ({ 
  children, 
  delay = 0, 
  className = '', 
  layout,
  ...props 
}) => {
  const prefersReduced = useReducedMotion();
  const transition = useTransitionConfig({ duration: 0.2, ease: whatsappEase }, 0.2, delay);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={transition}
      className={className}
      layout={layout}
      {...props}
    >
      {children}
    </motion.div>
  );
};

/**
 * Reusable Accessible SlideUp Component (Modals, drawers, and sheets)
 */
export const SlideUp: React.FC<AnimatedProps> = ({ 
  children, 
  delay = 0, 
  className = '', 
  layout,
  ...props 
}) => {
  const prefersReduced = useReducedMotion();
  const transition = useTransitionConfig({ duration: 0.25, ease: curves.smoothIn }, 0.25, delay);

  return (
    <motion.div
      initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
      transition={transition}
      className={className}
      layout={layout}
      {...props}
    >
      {children}
    </motion.div>
  );
};

/**
 * Reusable Accessible ScaleIn Component (Badges, check marks, pops)
 */
export const ScaleIn: React.FC<AnimatedProps> = ({ 
  children, 
  delay = 0, 
  className = '', 
  layout,
  ...props 
}) => {
  const prefersReduced = useReducedMotion();
  const transition = useTransitionConfig(whatsappSpring, 0.2, delay);

  return (
    <motion.div
      initial={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
      transition={transition}
      className={className}
      layout={layout}
      {...props}
    >
      {children}
    </motion.div>
  );
};

/**
 * WhatsApp Message Bubble Entrance Animation (Spring pop & slide in)
 */
export const MessageBubbleEnter: React.FC<AnimatedProps & { isOwn?: boolean }> = ({
  children,
  isOwn = false,
  className = '',
  layout,
  ...props
}) => {
  const prefersReduced = useReducedMotion();
  const transition = useTransitionConfig(whatsappSpring, 0.22);

  return (
    <motion.div
      initial={
        prefersReduced 
          ? { opacity: 0 } 
          : {
              opacity: 0,
              scale: 0.94,
              x: isOwn ? 16 : -16,
              y: 4,
            }
      }
      animate={{
        opacity: 1,
        scale: 1,
        x: 0,
        y: 0,
      }}
      exit={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 4 }}
      transition={transition}
      className={className}
      layout={layout}
      {...props}
    >
      {children}
    </motion.div>
  );
};

/**
 * WhatsApp Chat / Contact List Item Entrance Animation with Staggering
 */
export const ListItemEnter: React.FC<AnimatedProps & { index?: number }> = ({
  children,
  index = 0,
  className = '',
  layout,
  ...props
}) => {
  const prefersReduced = useReducedMotion();
  const staggerDelay = prefersReduced ? 0 : Math.min(index * 0.025, 0.25);
  const transition = useTransitionConfig({ duration: 0.18, ease: whatsappEase }, 0.18, staggerDelay);

  return (
    <motion.div
      initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
      transition={transition}
      className={className}
      layout={layout}
      {...props}
    >
      {children}
    </motion.div>
  );
};

/**
 * Smooth Layout Motion Container (perfect for list sorting, filters, typing removals)
 */
export const LayoutListContainer: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => {
  const prefersReduced = useReducedMotion();
  return (
    <motion.div 
      layout={!prefersReduced}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * Animated Pulse Typing Indicator Dot
 */
export const TypingDot: React.FC<{ delay?: number }> = ({ delay = 0 }) => {
  const prefersReduced = useReducedMotion();
  
  if (prefersReduced) {
    return <span className="w-1.5 h-1.5 bg-sky-500 rounded-full inline-block mx-0.5 animate-pulse" />;
  }

  return (
    <motion.span
      animate={{
        y: [0, -4, 0],
        opacity: [0.4, 1, 0.4],
      }}
      transition={{
        duration: 0.7,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
      className="w-1.5 h-1.5 bg-sky-500 rounded-full inline-block mx-0.5"
    />
  );
};

export { AnimatePresence };
