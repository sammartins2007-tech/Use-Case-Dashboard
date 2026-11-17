/**
 * Offline viewer build: `npm run build:viewer` -> public/offline-viewer.txt.
 *
 * The whole app compiled once in production mode, with every script, style sheet, font and image inlined
 * into ONE html document (saved as .txt so every host serves it as a plain file). It holds no use-case data
 * and no customer configuration: `@/radar.config` is replaced by the neutral src/viewer/radar.config.ts.
 * The "Download offline copy" menu fetches this file and inserts `<script>window.__UCX__=…</script>`
 * (one use case + its own account's config) before the module script; static-boot.ts then runs the app
 * read-only from that snapshot with hash routing.
 *
 * The SharePoint connector's actions (saving files to the site) never reach the viewer: `@/lib/sharepoint-save`
 * is replaced by src/viewer/sharepoint-save.ts and the `sharepointonline` action catalog is dropped from
 * generated/dataSources.ts (withoutSharePointActions); the SharePoint action client re-exported by src/data/services.ts
 * is replaced by a refusing stub (withoutSharePointService).
 *
 * Regenerate it after every source change, before publishing (see README.md / AGENTS.md).
 */
import fs from "node:fs";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import type { Plugin } from "vite";

const root = process.cwd();
const OUT_DIR = path.resolve(root, ".viewer-dist");
const TARGET = path.resolve(root, "public/offline-viewer.txt");
export const VIEWER_MARKER = '<meta name="ucx-viewer" content="1" />';

const escScript = (s: string) => s.replace(/<\/(script)/gi, "<\\/$1").replace(/<!--/g, "\\x3C!--");
const escStyle = (s: string) => s.replace(/<\/(style)/gi, "\\3C/$1");

/** Drops the SharePoint action binding from generated/dataSources.ts (the lists keep their own entries). */
function withoutSharePointActions(): Plugin {
  const target = path.resolve(root, "generated/dataSources.ts");
  return {
    name: "ucx-viewer-no-sharepoint-actions",
    enforce: "pre",
    transform(code, id) {
      if (path.resolve(id.split("?")[0]) !== target) return null;
      const at = code.indexOf("export default");
      if (at < 0) throw new Error("viewer: unexpected generated/dataSources.ts shape");
      const all = JSON.parse(code.slice(at + "export default".length).trim().replace(/;\s*$/, "")) as Record<string, unknown>;
      delete all.sharepointonline;
      return { code: `export default ${JSON.stringify(all)};\n`, map: null };
    },
  };
}

/**
 * Replaces the SharePoint action client with a refusing stub: src/data/services.ts (the data binding adapter)
 * re-exports it for the live app, but the viewer must never carry the connector's file actions.
 */
function withoutSharePointService(): Plugin {
  const target = path.resolve(root, "generated/services/SharePointService.ts");
  return {
    name: "ucx-viewer-no-sharepoint-service",
    enforce: "pre",
    transform(_code, id) {
      if (path.resolve(id.split("?")[0]) !== target) return null;
      return {
        code: 'export class SharePointService {\n  static async CreateFile() {\n    return { success: false, error: new Error("Not available in an offline copy.") };\n  }\n}\n',
        map: null,
      };
    },
  };
}

function inlineIntoOneFile(): Plugin {
  return {
    name: "ucx-viewer-inline",
    apply: "build",
    enforce: "post",
    generateBundle(_options, bundle) {
      const html = Object.values(bundle).find((f) => f.type === "asset" && f.fileName.endsWith(".html"));
      if (!html || html.type !== "asset") throw new Error("viewer: no index.html in the bundle");
      let doc = String(html.source);
      const css: string[] = [];
      const js: string[] = [];
      for (const [name, f] of Object.entries(bundle)) {
        if (f.type === "chunk" && f.isEntry) {
          // Dynamic imports are inlined, so their preload list is empty; Vite leaves the placeholder unreplaced
          // in a single-chunk build, which broke "Export PDF" in offline copies (ReferenceError).
          js.push(f.code.replace(/\b__VITE_PRELOAD__\b/g, "void 0"));
          if (process.env.VIEWER_STATS) {
            const by = new Map<string, number>();
            for (const [id, m] of Object.entries(f.modules)) {
              const k = id.includes("node_modules/") ? id.split("node_modules/").pop()!.split("/").slice(0, id.split("node_modules/").pop()!.startsWith("@") ? 2 : 1).join("/") : id.replace(root, "").split("/").slice(0, 3).join("/");
              by.set(k, (by.get(k) ?? 0) + m.renderedLength);
            }
            console.log([...by].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, v]) => `${Math.round(v / 1024)} KB  ${k}`).join("\n"));
          }
        }
        else if (f.type === "chunk") throw new Error(`viewer: unexpected extra chunk ${name}`);
        else if (name.endsWith(".css")) css.push(String(f.source));
        else if (f !== html) throw new Error(`viewer: asset ${name} was not inlined (raise assetsInlineLimit)`);
      }
      if (js.length !== 1) throw new Error(`viewer: expected one script, got ${js.length}`);
      doc = doc.replace(/\s*<script type="module"[^>]*src="[^"]+"[^>]*><\/script>/g, "").replace(/\s*<link rel="stylesheet"[^>]*href="[^"]+"[^>]*>/g, "");
      doc = doc.replace(/<!--[\s\S]*?-->/g, "");
      doc = doc.replace("<head>", () => `<head>\n    ${VIEWER_MARKER}`);
      // Snapshot-free: the offline copy inserts window.__UCX__ right before this module script.
      // Function replacers: the code contains "$`" / "$&" sequences that a replacement string would expand.
      const styles = css.map((c) => `<style>${escStyle(c)}</style>`).join("\n");
      doc = doc.replace("</head>", () => `${styles}\n</head>`);
      const script = `<script type="module">${escScript(js[0])}</script>`;
      doc = doc.replace("</body>", () => `${script}\n</body>`);
      for (const name of Object.keys(bundle)) delete bundle[name];
      this.emitFile({ type: "asset", fileName: "offline-viewer.txt", source: doc });
    },
    writeBundle() {
      fs.mkdirSync(path.dirname(TARGET), { recursive: true });
      fs.copyFileSync(path.join(OUT_DIR, "offline-viewer.txt"), TARGET);
      console.log(`[viewer] wrote ${path.relative(root, TARGET)} (${Math.round(fs.statSync(TARGET).size / 1024)} KB)`);
    },
  };
}

export default defineConfig({
  base: "./",
  mode: "production",
  publicDir: false,
  plugins: [withoutSharePointActions(), withoutSharePointService(), react(), tailwindcss(), inlineIntoOneFile()],
  assetsInclude: ["**/*.glb", "**/*.gltf", "**/*.obj", "**/*.stl"],
  cacheDir: path.resolve(process.env.AETHER_VITE_CACHE_DIR || path.resolve(root, ".vite-cache"), "viewer"),
  resolve: {
    alias: [
      { find: /^@\/radar\.config$/, replacement: path.resolve(root, "src/viewer/radar.config.ts") },
      { find: /^@\/lib\/sharepoint-save$/, replacement: path.resolve(root, "src/viewer/sharepoint-save.ts") },
      { find: "@", replacement: path.resolve(root, "src") },
      { find: "@tanstack/react-query", replacement: path.resolve(root, "node_modules/@tanstack/react-query/src/index.ts") },
      { find: "@tanstack/query-core", replacement: path.resolve(root, "node_modules/@tanstack/query-core/src/index.ts") },
      { find: "@tanstack/react-table", replacement: path.resolve(root, "node_modules/@tanstack/react-table/src/index.tsx") },
      { find: "@tanstack/table-core", replacement: path.resolve(root, "node_modules/@tanstack/table-core/src/index.ts") },
    ],
  },
  build: {
    outDir: OUT_DIR,
    emptyOutDir: true,
    assetsInlineLimit: () => true,
    cssCodeSplit: false,
    modulePreload: false,
    chunkSizeWarningLimit: 100_000,
    reportCompressedSize: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
