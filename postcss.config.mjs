/** @type {import('postcss').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {}, // Usa o novo plugin do Tailwind v4
    'autoprefixer': {},
  },
};

export default config;
