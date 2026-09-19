/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./context/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        brand: {
          50: "#FAF5FF",
          100: "#F3E8FF",
          200: "#E9D5FF",
          300: "#D8B4FE",
          400: "#C084FC", // Glow
          500: "#A855F7", // Accent
          600: "#7C3AED", // Purple
          700: "#6D28D9", // Primary
          800: "#5B21B6",
          900: "#4C1D95",
          950: "#2E1A47", // Dark Border
        },
        dark: {
          bg: "#0B0512",
          card: "#170D25",
          cardHover: "#201335",
          border: "#2E1A47",
          borderLight: "#422765",
        }
      },
      boxShadow: {
        "glow-sm": "0 0 15px -3px rgba(192, 132, 252, 0.2)",
        "glow": "0 0 25px -5px rgba(168, 85, 247, 0.3)",
        "glow-lg": "0 0 35px -5px rgba(124, 58, 237, 0.4)",
      },
      animation: {
        "meteor-effect": "meteor 5s linear infinite",
      },
      keyframes: {
        meteor: {
          "0%": { transform: "rotate(215deg) translateX(0)", opacity: "1" },
          "70%": { opacity: "1" },
          "100%": {
            transform: "rotate(215deg) translateX(-500px)",
            opacity: "0",
          },
        },
      },
    },
  },
  plugins: [],
};