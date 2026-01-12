/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary accent - green like the Codex app
        'accent': '#22c55e',
        'accent-dim': '#16a34a',
        'accent-bright': '#4ade80',
        // Legacy aliases for compatibility
        'cyber-cyan': '#22c55e',
        'cyber-cyan-dim': '#16a34a',
        // Darker charcoal palette matching the screenshot
        'charcoal': {
          950: '#0a0a0a',
          900: '#0f0f0f',
          800: '#141414',
          700: '#1a1a1a',
          600: '#242424',
          500: '#2d2d2d',
          400: '#3d3d3d',
          300: '#525252',
        },
        // Status colors
        'status': {
          green: '#22c55e',
          yellow: '#eab308',
          red: '#ef4444',
          blue: '#3b82f6',
        },
        // Frost/glass effects - slightly more subtle
        'frost': {
          light: 'rgba(255, 255, 255, 0.05)',
          medium: 'rgba(255, 255, 255, 0.08)',
          heavy: 'rgba(255, 255, 255, 0.12)',
        }
      },
      fontFamily: {
        'sans': ['JetBrains Mono', 'Fira Code', 'monospace'],
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backdropBlur: {
        'xs': '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      boxShadow: {
        'glow': '0 0 20px rgba(34, 197, 94, 0.3)',
        'glow-lg': '0 0 40px rgba(34, 197, 94, 0.4)',
        'glow-sm': '0 0 10px rgba(34, 197, 94, 0.2)',
        // Subtle elevation shadows for cards
        'card': '0 2px 8px rgba(0, 0, 0, 0.4)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.5)',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
}
