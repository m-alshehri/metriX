import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        metrix: {
          50: "#fbf5fb",
          100: "#f6e8f5",
          200: "#ecd0e9",
          300: "#dda9d7",
          400: "#ca75bf",
          500: "#ad4aa2",
          600: "#8d357f",
          700: "#702a64",
          800: "#55214d",
          900: "#330033",
          950: "#230022"
        }
      },
      boxShadow: {
        soft: "0 20px 60px rgba(51,0,51,0.10)"
      }
    }
  },
  plugins: []
};

export default config;
