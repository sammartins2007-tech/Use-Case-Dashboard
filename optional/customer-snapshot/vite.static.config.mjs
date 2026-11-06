import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  cacheDir: "/tmp/static/.vite-cache",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
  build: { outDir: "dist", assetsInlineLimit: 100000000, cssCodeSplit: false, chunkSizeWarningLimit: 100000, rollupOptions: { output: { inlineDynamicImports: true } } },
});
