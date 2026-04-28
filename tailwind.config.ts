import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sight: {
          50: "#f0f7ff",
          100: "#e0effe",
          200: "#bae0fd",
          300: "#7cc8fc",
          400: "#36adf8",
          500: "#0c93e9",
          600: "#0074c7",
          700: "#015da1",
          800: "#064f85",
          900: "#0b426e",
          950: "#072a49",
        },
        dark: {
          50: "#f6f6f7",
          100: "#e2e3e5",
          200: "#c4c6cb",
          300: "#9fa2a9",
          400: "#7b7e87",
          500: "#60636c",
          600: "#4c4e56",
          700: "#3e4047",
          800: "#35363b",
          900: "#1a1b1e",
          950: "#0d0d0f",
        },
      },
    },
  },
  plugins: [],
};
export default config;
