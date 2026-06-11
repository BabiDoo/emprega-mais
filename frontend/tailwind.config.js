/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0D3D85',
          50: '#E8F0FB',
          100: '#C5D6F5',
          200: '#8AAEE9',
          300: '#4F87DE',
          400: '#1F5EC9',
          500: '#0D3D85',
          600: '#0A3070',
          700: '#08245A',
          800: '#051845',
          900: '#030C2A',
        },
        accent: {
          DEFAULT: '#7ACB2D',
          50: '#F0FAE3',
          100: '#D9F2B8',
          200: '#B5E873',
          300: '#91DC35',
          400: '#7ACB2D',
          500: '#63A825',
          600: '#4D851D',
          700: '#376115',
          800: '#223D0D',
          900: '#0C1A05',
        },
        surface: '#F4F6F8',
        white: '#FFFFFF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 12px rgba(13, 61, 133, 0.08)',
        'card-hover': '0 4px 24px rgba(13, 61, 133, 0.15)',
      }
    },
  },
  plugins: [],
}
