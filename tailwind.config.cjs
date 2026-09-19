/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#111827',
        'brand-dark': '#1F2937',
        'brand-gold': '#C9A227',
        'brand-bg': '#F8F8F6',
        white: '#FFFFFF',
        'brand-muted': '#6B7280',
        'brand-success': '#15803D',
        'brand-error': '#DC2626',
      },
      boxShadow: {
        soft: '0 10px 35px rgba(17, 24, 39, 0.08)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

