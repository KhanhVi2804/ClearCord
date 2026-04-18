import { fileURLToPath, URL } from "node:url";
import { defineConfig, transformWithEsbuild } from "vite";
import react from "@vitejs/plugin-react";

const backendClientOutDir = fileURLToPath(
  new URL("../ClearCord/wwwroot/client", import.meta.url)
);

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/client/" : "/",
  plugins: [
    {
      name: "treat-js-files-as-jsx",
      async transform(code, id) {
        if (!/src\/.*\.js$/.test(id)) {
          return null;
        }

        return transformWithEsbuild(code, id, {
          loader: "jsx",
          jsx: "automatic"
        });
      }
    },
    react()
  ],
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx"
      }
    }
  },
  build: {
    outDir: backendClientOutDir,
    emptyOutDir: true
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api": {
        target: "https://localhost:7187",
        changeOrigin: true,
        secure: false
      },
      "/hubs": {
        target: "https://localhost:7187",
        changeOrigin: true,
        secure: false,
        ws: true
      },
      "/uploads": {
        target: "https://localhost:7187",
        changeOrigin: true,
        secure: false
      }
    }
  }
}));
