import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["'DM Sans'", "system-ui", "sans-serif"],
        display: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          text: "hsl(var(--warning-text))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        teal: { DEFAULT: "hsl(var(--teal))", deep: "hsl(var(--teal-deep))" },
        navy: { ink: "hsl(var(--navy-ink))", deep: "hsl(var(--navy-deep))" },
        brand: {
          navy: "#173B8D",
          navyInk: "#0E2156",
          navyDeep: "#0B1330",
          teal: "#51CDD4",
          tealDeep: "#1FA6AE",
          green: "#0A9881",
          greenDeep: "#067A68",
        },
        ink: { DEFAULT: "#141A2E", 2: "#3A4661" },
        line: { DEFAULT: "#E6EAF3", 2: "#D8DEEC" },
      },
      borderRadius: {
        // 00-foundations §5: cards 14px (lg), buttons & inputs 10px (md), small chips 8px (sm).
        lg: "var(--radius)",                  // 14px — cards
        md: "calc(var(--radius) - 4px)",      // 10px — buttons, inputs, nav links, chips
        sm: "calc(var(--radius) - 6px)",      // 8px  — sm buttons, small pills
        xl: "18px",
        "2xl": "24px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,28,64,.05), 0 1px 3px rgba(16,28,64,.04)",
        elevated: "0 4px 14px rgba(16,28,64,.07), 0 2px 6px rgba(16,28,64,.04)",
        prominent: "0 18px 48px rgba(16,28,64,.14), 0 6px 18px rgba(16,28,64,.08)",
      },
      maxWidth: { content: "1240px" },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
