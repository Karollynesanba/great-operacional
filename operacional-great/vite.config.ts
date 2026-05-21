import { defineConfig } from "vite";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  const plugins = [];

  if (mode === "development" && process.env.CYPRESS !== "true") {
    try {
      const { componentTagger } = await import("lovable-tagger");
      plugins.push(componentTagger());
    } catch (error) {
      console.warn("[vite] lovable-tagger unavailable, continuing without it:", error);
    }
  }

  return {
    esbuild: {
      jsx: "automatic",
      jsxImportSource: "react",
    },
    server: {
      host: "::",
      port: 8080,
    },
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      // Prevent duplicate React instances
      dedupe: ["react", "react-dom", "react/jsx-runtime"],
    },
  };
});
