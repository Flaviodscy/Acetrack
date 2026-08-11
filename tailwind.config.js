/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        tennis: {
          lime: "#cdea5f",
          dark: "#1e2b11",
          court: "#2b3a24",
          surface: "#f8faf0",
          card: "#ffffff",
          sub: "#75826e",
          border: "rgba(38, 54, 31, 0.08)",
        },
      },
    },
  },
  plugins: [],
};
