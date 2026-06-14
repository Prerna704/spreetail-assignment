/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#111827',
        paper: '#f5f0ff',
        line: '#ddd6fe',
        accent: '#7c3aed',
        coral: '#be3a34'
      }
    }
  },
  plugins: []
};
