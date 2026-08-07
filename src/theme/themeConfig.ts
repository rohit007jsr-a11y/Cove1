/**
 * COVE DESIGN SYSTEM TOKENS & DESIGN GUIDELINES
 * 
 * Math step scales, typography metrics, color systems, border radius rules,
 * spacing configurations, shadow depths, and animation timings.
 */

export const DESIGN_TOKENS = {
  // 1. Color Palette: Cool Slate Neutrals with Premium Teal/Sky Accents
  colors: {
    brand: {
      primary: '#0EA5E9',       // Sky 500 - Prominent buttons, primary highlights
      primaryHover: '#0284C7',  // Sky 600 - Active / Hover buttons
      primaryLight: '#E0F2FE',  // Sky 100 - Self message bubble backgrounds, light tags
      primarySubtle: '#F0F9FF', // Sky 50 - Active tab highlights, calm accents
    },
    accent: {
      emerald: '#10B981',       // Success, Online indicators, Read ticks
      emeraldSubtle: '#D1FAE5', // Success backgrounds
      rose: '#EF4444',          // Errors, Sign-out, Call Decline buttons
      roseSubtle: '#FEE2E2',    // Error backgrounds
      amber: '#F59E0B',         // Warnings, Pending status, Ringing indicators
      amberSubtle: '#FEF3C7',   // Warning backgrounds
    },
    neutral: {
      white: '#FFFFFF',
      slate50: '#F8FAFC',       // Main app background
      slate100: '#F1F5F9',      // Secondary sidebar items, non-selected tabs
      slate200: '#E2E8F0',      // Dividers, thin borders
      slate300: '#CBD5E1',      // Placeholder text, disabled icon outlines
      slate400: '#94A3B8',      // Auxiliary helper text, timestamp subtitles
      slate500: '#64748B',      // Standard body label, primary icons
      slate600: '#475569',      // Dark text labels, active icons
      slate800: '#1E293B',      // Contrast cards, headers, dark mode bases
      slate900: '#0F172A',      // Pure slate overlay backdrops
      slate950: '#020617',      // Call screens, heavy background overlays
    }
  },

  // 2. Typography Scale: Low-Contrast Major Second (1.125) for Dense, Complex App UIs
  typography: {
    fontFamily: {
      sans: 'Inter, system-ui, -apple-system, sans-serif',
      display: 'Plus Jakarta Sans, Playfair Display, sans-serif',
      mono: 'JetBrains Mono, SFMono-Regular, monospace',
    },
    scale: {
      caption: '11px',     // Metadata, message timestamp, typing tags
      xs: '12px',          // Badges, small pills, input helper messages
      sm: '14px',          // Secondary labels, sidebar subtitles, description text
      base: '16px',        // Primary text size (Standard message bubble copy, input labels)
      md: '18px',          // Sub-headers, modal title tags
      lg: '20px',          // Section titles, profile names
      xl: '24px',          // Highlight displays
      xxl: '32px',         // Large visual display headings
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.7,
    },
    letterSpacing: {
      tight: '-0.025em',
      normal: '0em',
      wide: '0.05em',
    }
  },

  // 3. Spacing Rhythm System: Math-derived intervals with strict padding boundaries
  spacing: {
    xs: '4px',             // Micro-padding, spacing between icon and text inside a badge
    sm: '8px',             // Item gap, spacing between list items, minor details
    md: '12px',            // Component internal padding, spacing between bubble and user meta
    base: '16px',          // Container outer margins, chat row padding, core layout bounds
    lg: '24px',            // Large separation gaps between major page sections
    xl: '32px',            // Section gutters
    xxl: '48px',           // Massive negative space blocks for displays
  },

  // 4. Border Radius Matrix with Nested Radius Compatibility
  // Rule: Inside Corner Radius = Outside Corner Radius - Distance Between the Two (Padding)
  radii: {
    sm: '4px',             // Minor element rounding (inline tags, checkboxes)
    md: '8px',             // Sub-items (inputs, user avatars, chat bubbles)
    lg: '12px',            // Standard cards, dropdown container overlays
    xl: '16px',            // Page panels, modal wrappers (Maximum standard card curvature)
    pill: '9999px',        // Badges, toggle buttons, full pill buttons
  },

  // 5. Layered Depth Shadows (Light theme-optimized soft blurs)
  // Strict check: Avoid mixing hairline borders and heavy shadows unless color contrast permits.
  shadows: {
    none: 'none',
    '2xs': '0 1px 2px rgba(15, 23, 42, 0.03)',
    xs: '0 2px 4px rgba(15, 23, 42, 0.05)',
    sm: '0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -1px rgba(15, 23, 42, 0.04)',
    md: '0 10px 15px -3px rgba(15, 23, 42, 0.1), 0 4px 6px -2px rgba(15, 23, 42, 0.05)',
    lg: '0 20px 25px -5px rgba(15, 23, 42, 0.15), 0 10px 10px -5px rgba(15, 23, 42, 0.04)',
  },

  // 6. Animation Timings & Physics Easing Timings
  animations: {
    durations: {
      micro: '100ms',      // Hover micro-transitions, toggle flips
      fast: '150ms',       // Message bubble entrances, list layout shifts
      normal: '220ms',     // Modal entries, drawer slide outs, main view switches
      slow: '350ms',       // Full page fade-in entries
    },
    curves: {
      whatsappEase: [0.2, 0, 0, 1], // WhatsApp custom signature swift-entry cubic bezier
      smoothIn: [0.16, 1, 0.3, 1],  // Soft deceleration
      springPhysics: {
        type: 'spring',
        stiffness: 400,
        damping: 28,
        mass: 0.8,
      }
    }
  }
};

/**
 * ANIMATION GUIDELINES & BEST PRACTICES:
 * 1. WHEN TO ANIMATE: Use animations to show visual hierarchy, content entrance, and structural transitions.
 * 2. WHEN NOT TO ANIMATE: Avoid animating large tables, scrolling contents, background rendering, and repetitively repeating tasks.
 * 3. ACCESSIBILITY FIRST: Always honor the 'prefers-reduced-motion' preference. For reduced motion, drop durations to 0ms and scale animations to standard fades.
 */
