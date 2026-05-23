import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { nitro } from "nitro/vite";

const isVercel = process.env.VERCEL === "1";

// Cloudflare: custom server.ts wrapper via @cloudflare/vite-plugin.
// Vercel: Nitro preset produces the Build Output API (fixes NOT_FOUND on deploy).
export default defineConfig({
  plugins: [
    ...(isVercel
      ? []
      : [
          cloudflare({
            viteEnvironment: { name: "ssr" },
          }),
        ]),
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart(
      isVercel
        ? {}
        : {
            server: { entry: "server" },
          },
    ),
    react(),
    ...(isVercel ? [nitro()] : []),
  ],
});
