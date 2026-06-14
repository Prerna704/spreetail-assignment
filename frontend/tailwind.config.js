/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#111827',
        paper: '#eef8ff',
        line: '#bfdbfe',
        accent: '#0284c7',
        coral: '#be3a34'
      }
    }
  },
  plugins: []
};
