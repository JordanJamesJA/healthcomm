import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // options to reduce console output
    hmr: true,
    watch: {
      ignored: ["**/node_modules/**"],
    },
  },
  logLevel: "warn", 
});
