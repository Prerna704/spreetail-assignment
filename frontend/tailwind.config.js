/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#111827',
        paper: '#f8fafc',
        line: '#d9e2ec',
        accent: '#0f766e',
        coral: '#be3a34'
      }
    }
  },
  plugins: []
};
