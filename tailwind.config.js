/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Sidebar / primary surfaces from the dashboard design reference
        navy: {
          50: '#EEF3F9',
          100: '#D8E3F1',
          200: '#AEC3DE',
          300: '#7B9BC4',
          400: '#4A72A6',
          500: '#2A5387',
          600: '#1B4272',
          700: '#143560',
          800: '#0E2A4D',
          900: '#0A2140',
          950: '#061731',
        },
        // Accent. White text sits on brand-700 or darker (about 5.4:1); brand-500 is
        // for icons, rings and borders only, because white on it is about 3:1.
        brand: {
          50: '#FFF4EC',
          100: '#FFE3D2',
          200: '#FFC5A5',
          300: '#FFA170',
          400: '#FA8241',
          500: '#F26B21',
          600: '#DE5811',
          700: '#B8450E',
          800: '#963A0D',
        },
        surface: '#F4F6F8',
        ink: '#0E2A4D',
        // slate-600: about 7.5:1 on white, so secondary text stays readable (senior UX plan R2)
        muted: '#475569',
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px rgba(14, 42, 77, 0.06), 0 1px 3px rgba(14, 42, 77, 0.05)',
        'card-hover': '0 4px 12px rgba(14, 42, 77, 0.10)',
      },
      borderRadius: {
        card: '0.75rem',
      },
    },
  },
  plugins: [],
}
