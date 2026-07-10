import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    // componentTagger disabled for local dev
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
  },
  build: {
    rollupOptions: {
      output: {
        // Function form keyed off node_modules paths. Every third-party module
        // is routed into a named vendor chunk; anything not explicitly grouped
        // is folded into the always-loaded vendor-react common chunk instead of
        // leaking into the entry (index) chunk. Heavy, route-specific libs
        // (maps, charts, markdown) get their own chunks so they only load on the
        // lazy routes that use them and stay out of the common/entry chunk.
        manualChunks(id) {
          // Normalise the path so matching works on both win32 and posix.
          const path = id.replace(/\\/g, "/");

          // The i18n translation tables are a ~1.1 MB pure-data leaf module
          // (string maps for 5 languages, no app imports) pulled in eagerly by
          // LanguageContext on every page. Isolating it keeps that large, stable
          // blob out of the entry chunk and in its own long-cacheable file that
          // doesn't bust on every app-shell change.
          if (/\/src\/i18n\/translations\.ts$/.test(path)) {
            return "i18n";
          }

          if (!id.includes("node_modules")) return undefined;

          // React core + router — needed on every page. Keep react, react-dom,
          // scheduler and the router together so their init order is stable.
          if (
            /\/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom)\//.test(
              path,
            )
          ) {
            return "vendor-react";
          }

          // TanStack Query — used app-wide for data fetching.
          if (/\/node_modules\/@tanstack\//.test(path)) {
            return "vendor-query";
          }

          // Maps — large, only used on search/map routes (lazy).
          // NB: match leaflet.markercluster too — the char after "leaflet" in
          // node_modules/leaflet.markercluster/ is "." not "/", so a bare
          // "leaflet\/" alternative misses it and it falls through to the eager
          // vendor-react catch-all (downloaded + parsed on every page).
          if (/\/node_modules\/(leaflet(\.markercluster)?|react-leaflet|@react-leaflet)\//.test(path)) {
            return "vendor-maps";
          }

          // Charts — only used on the provider analytics dashboard (lazy).
          // recharts pulls in d3-* and victory-vendor packages.
          if (
            /\/node_modules\/(recharts|d3-[^/]+|victory-vendor|internmap|delaunator|robust-predicates)\//.test(
              path,
            )
          ) {
            return "vendor-charts";
          }

          // Markdown — only used on blog post pages (lazy).
          if (
            /\/node_modules\/(react-markdown|remark-[^/]+|rehype-[^/]+|micromark[^/]*|mdast-[^/]+|hast-[^/]+|unist-[^/]+|unified|vfile[^/]*|property-information|space-separated-tokens|comma-separated-tokens|decode-named-character-reference|character-entities[^/]*|trim-lines|trough|bail|is-plain-obj|zwitch|html-url-attributes|ccount|escape-string-regexp|markdown-table|longest-streak|devlop)\//.test(
              path,
            )
          ) {
            return "vendor-markdown";
          }

          // Radix UI primitives + icon set — large but stable, shared widely.
          if (
            /\/node_modules\/(@radix-ui|lucide-react|cmdk|vaul|sonner|class-variance-authority|tailwind-merge|clsx)\//.test(
              path,
            )
          ) {
            return "vendor-ui";
          }

          // Forms + validation — used on auth/onboarding/booking forms.
          if (
            /\/node_modules\/(react-hook-form|@hookform|zod)\//.test(path)
          ) {
            return "vendor-forms";
          }

          // Date utilities — date-fns is sizeable and used in pickers/booking.
          if (/\/node_modules\/(date-fns|react-day-picker)\//.test(path)) {
            return "vendor-dates";
          }

          // Everything else third-party (always-loaded misc deps such as
          // react-helmet-async, use-sync-external-store, react-is, sonner deps,
          // etc.) is folded into the React common chunk. These are loaded on
          // every page anyway, and co-locating them with React avoids a
          // cross-chunk circular reference (a separate generic "vendor" chunk
          // both depends on and is depended upon by vendor-react). The result
          // is one stable always-loaded common chunk, no init-order cycle, and
          // the heavy route-specific libs (maps/charts/markdown) plus the large
          // stable groups (ui/forms/dates/query) still split out on their own.
          return "vendor-react";
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
}));
