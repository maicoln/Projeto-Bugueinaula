import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(0 0% 100%)',
        foreground: 'hsl(240 10% 3.9%)',
        card: 'hsl(0 0% 100%)',
        'card-foreground': 'hsl(240 10% 3.9%)',
        primary: 'hsl(240 5.9% 10%)',
        'primary-foreground': 'hsl(0 0% 98%)',
        secondary: 'hsl(240 4.8% 95.9%)',
        'secondary-foreground': 'hsl(240 5.9% 10%)',
        muted: 'hsl(240 4.8% 95.9%)',
        'muted-foreground': 'hsl(240 3.8% 46.1%)',
        accent: 'hsl(240 4.8% 95.9%)',
        'accent-foreground': 'hsl(240 5.9% 10%)',
        border: 'hsl(240 5.9% 90%)',
        input: 'hsl(240 5.9% 90%)',
        
        dark: {
          background: 'hsl(240 10% 3.9%)',
          foreground: 'hsl(0 0% 98%)',
          card: 'hsl(240 10% 3.9%)',
          'card-foreground': 'hsl(0 0% 98%)',
          primary: 'hsl(0 0% 98%)',
          'primary-foreground': 'hsl(240 5.9% 10%)',
          secondary: 'hsl(240 3.7% 15.9%)',
          'secondary-foreground': 'hsl(0 0% 98%)',
          muted: 'hsl(240 3.7% 15.9%)',
          'muted-foreground': 'hsl(240 5% 64.9%)',
          accent: 'hsl(240 3.7% 15.9%)',
          'accent-foreground': 'hsl(0 0% 98%)',
          border: 'hsl(240 3.7% 15.9%)',
          input: 'hsl(240 3.7% 15.9%)',
        },
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-in-out',
      },
    },
  },
  plugins: [],
};

export default config;

