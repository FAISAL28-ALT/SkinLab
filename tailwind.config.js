/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          lime: '#C5F04A',
          orange: '#FF681F',
          blue: '#5798F5',
          yellow: '#FFD34E',
          navy: '#171A35',
          secondary: '#777987',
          navbar: '#090909',
          dark: '#090909',
          canvas: '#FFFFFF',
          card: '#F6F7F9',
          border: '#E3E6EB',
          muted: '#777987',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        display: ['"Space Grotesk"', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '20px',
        '3xl': '28px',
        '4xl': '36px',
        '5xl': '44px',
      },
      boxShadow: {
        neo: '4px 4px 0px 0px #171A35',
        'neo-sm': '2px 2px 0px 0px #171A35',
        'neo-lime': '4px 4px 0px 0px #C5F04A',
        card: '0 4px 20px -2px rgba(23, 26, 53, 0.05)',
      },
    },
  },
  plugins: [],
};
