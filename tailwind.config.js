/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        hn: {
          900: '#3D5A82',
          800: '#637FA8',
          700: '#748CAF',
          500: '#8CA7C9',
          300: '#BBCEE5',
          100: '#E8F0F8',
          50:  '#F4F8FC',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
