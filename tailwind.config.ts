import type { Config } from "tailwindcss";

const color = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: {
    colors: {
      background: color("background"),
      surface: { DEFAULT: color("surface"), hover: color("surface-hover"), raised: color("surface-raised") },
      border: { DEFAULT: color("border"), strong: color("border-strong") },
      ink: { DEFAULT: color("text-primary"), secondary: color("text-secondary"), tertiary: color("text-tertiary"), inverse: color("text-inverse") },
      primary: { DEFAULT: color("primary"), hover: color("primary-hover"), light: color("primary-light"), ink: color("primary-ink") },
      "on-primary": color("on-primary"), accent: { DEFAULT: color("accent"), light: color("accent-light") }, focus: color("focus"),
      success: { DEFAULT: color("success"), light: color("success-light") },
      error: { DEFAULT: color("error"), light: color("error-light") },
      warning: { DEFAULT: color("warning"), light: color("warning-light") },
      info: { DEFAULT: color("info"), light: color("info-light") },
      danger: { DEFAULT: color("danger-fill"), hover: color("danger-hover") }, "on-danger": color("on-danger"),
      role: { organizer: color("role-organizer"), judge: color("role-judge"), participant: color("role-participant"), admin: color("role-admin") },
    },
    fontFamily: { sans: ["Inter", "Segoe UI", "sans-serif"], mono: ["ui-monospace", "SFMono-Regular", "Consolas", "monospace"] },
    fontSize: { h1: ["36px", { lineHeight: "44px", fontWeight: "700" }], h2: ["28px", { lineHeight: "36px", fontWeight: "600" }], h3: ["22px", { lineHeight: "28px", fontWeight: "600" }], h4: ["18px", { lineHeight: "24px", fontWeight: "600" }] },
    borderRadius: { none: "0", sm: "4px", DEFAULT: "4px", md: "8px", lg: "12px", full: "9999px" },
    boxShadow: { sm: "0 1px 2px rgb(0 0 0 / .08)", menu: "var(--menu-shadow)", dialog: "var(--dialog-shadow)" },
  } },
  plugins: [],
} satisfies Config;
