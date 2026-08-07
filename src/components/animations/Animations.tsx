import React from 'react';
import { motion, AnimatePresence, HTMLMotionProps } from 'motion/react';

// WhatsApp Spring & Timing Curves (150ms - 250ms)
export const whatsappEase = [0.2, 0, 0, 1] as const;
export const whatsappSpring = {
  type: 'spring',
  stiffness: 400,
  damping: 28,
  mass: 0.8,
} as const;

interface AnimatedProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

/**
 * Reusable FadeIn container
 */
export const FadeIn: React.FC<AnimatedProps> = ({ children, delay = 0, className = '', ...props }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2, ease: whatsappEase, delay }}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

/**
 * Reusable SlideUp container for modals, sheets, and popups
 */
export const SlideUp: React.FC<AnimatedProps> = ({ children, delay = 0, className = '', ...props }) => (
  <motion.div
    initial={{ opacity: 0, y: 12, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 10, scale: 0.98 }}
    transition={{ duration: 0.22, ease: whatsappEase, delay }}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

/**
 * WhatsApp Message Bubble Entrance Animation (Spring pop & slide in)
 */
export const MessageBubbleEnter: React.FC<AnimatedProps & { isOwn?: boolean }> = ({
  children,
  isOwn = false,
  className = '',
  ...props
}) => (
  <motion.div
    initial={{
      opacity: 0,
      scale: 0.92,
      x: isOwn ? 16 : -16,
      y: 6,
    }}
    animate={{
      opacity: 1,
      scale: 1,
      x: 0,
      y: 0,
    }}
    exit={{ opacity: 0, scale: 0.9, y: 4 }}
    transition={whatsappSpring}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

/**
 * WhatsApp Chat / Contact List Item Entrance Animation
 */
export const ListItemEnter: React.FC<AnimatedProps & { index?: number }> = ({
  children,
  index = 0,
  className = '',
  ...props
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -6 }}
    transition={{
      duration: 0.18,
      ease: whatsappEase,
      delay: Math.min(index * 0.03, 0.3),
    }}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

/**
 * Animated Pulse Typing Indicator Dot
 */
export const TypingDot: React.FC<{ delay?: number }> = ({ delay = 0 }) => (
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

export { AnimatePresence };
