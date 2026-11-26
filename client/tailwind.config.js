export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        serif: ['"Source Serif 4"', 'Georgia', 'serif']
      },
      colors: {
        primary: '#1e293b',
        accent: '#0f766e',
        dark: '#0c0f14'
      }
    }
  },
  plugins: []
}
