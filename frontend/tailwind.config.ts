import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#000047",
        mist: "#dbe7ff",
        moss: "#4b5563",
        coral: "#00d9e8",
        ocean: "#3534cd",
        mint: "#00ffff",
        cloud: "#f7f9ff",
        paper: "#ffffff",
        magnafic: "#3534cd"
      },
      boxShadow: {
        soft: "0 24px 70px rgba(0, 0, 71, 0.13)",
        card: "0 12px 32px rgba(0, 0, 71, 0.08)",
        glow: "0 0 26px rgba(0, 255, 255, 0.30)"
      }
    }
  },
  plugins: []
};

export default config;
