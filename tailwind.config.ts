import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4f46e5',
          dark: '#3730a3',
          light: '#a5b4fc',
        },
        secondary: {
          DEFAULT: '#0ea5e9',
          dark: '#0369a1',
        },
        accent: '#f97316',
        surface: '#0f172a',
      },
      boxShadow: {
        soft: '0 25px 45px -25px rgba(15,23,42,0.35)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}

export default config
