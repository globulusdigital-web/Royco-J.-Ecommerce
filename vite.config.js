import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import netlify from "@netlify/vite-plugin";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    ...(mode === "frontend" ? [] : [netlify()]),
  ],
  server: {
    host: "127.0.0.1",
    port: 4173,
  },
  preview: {
    host: "127.0.0.1",
    port: 4174,
  },
  build: {
    target: "es2022",
    sourcemap: false,
  },
}));
