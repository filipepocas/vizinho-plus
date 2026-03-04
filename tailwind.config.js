/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cores extraídas para o estilo Limpo Corporativo
        'vplus-green-light': '#DCFCE7',
        'vplus-green': '#22C55E',
        'vplus-blue': '#1E3A8A',
        'vplus-blue-light': '#EFF6FF',
      },
    },
  },
  plugins: [],
}