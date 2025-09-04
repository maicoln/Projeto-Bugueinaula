// Local: /postcss.config.mjs
/** @type {import('postcss').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {}, // Usando o nome do novo pacote aqui
    autoprefixer: {},
  },
};

export default config;