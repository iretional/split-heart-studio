import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Relative paths, because GitHub Pages serves the app from /split-heart-studio/.
  base: "./",
  plugins: [react()],
  server: { host: "127.0.0.1" },
});
