import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: {
    colors: {
      background: "#FAFAFA", surface: { DEFAULT: "#FFFFFF", hover: "#F5F5F5" }, border: { DEFAULT: "#E5E5E5", strong: "#D4D4D4" },
      ink: { DEFAULT: "#0A0A0A", secondary: "#525252", tertiary: "#A3A3A3", inverse: "#FFFFFF" },
      primary: { DEFAULT: "#2563EB", hover: "#1D4ED8", light: "#EFF6FF" },
      success: { DEFAULT: "#16A34A", light: "#F0FDF4" }, error: { DEFAULT: "#DC2626", light: "#FEF2F2" },
      warning: { DEFAULT: "#D97706", light: "#FFFBEB" }, role: { organizer: "#7C3AED", judge: "#0891B2", participant: "#059669", admin: "#DC2626" },
    },
    fontFamily: { sans: ["Inter", "Segoe UI", "sans-serif"] },
    fontSize: { h1: ["36px", { lineHeight: "44px", fontWeight: "700" }], h2: ["28px", { lineHeight: "36px", fontWeight: "600" }], h3: ["22px", { lineHeight: "28px", fontWeight: "600" }], h4: ["18px", { lineHeight: "24px", fontWeight: "600" }] },
  } },
  plugins: [],
} satisfies Config;
