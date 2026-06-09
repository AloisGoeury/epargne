import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const localDataRoute = "/__local-data__/epargne-data.json";
const localDataFile = fileURLToPath(new URL("./.local/epargne-data.json", import.meta.url));

const localDataPlugin = () => ({
  name: "local-data-plugin",
  configureServer(server: { middlewares: { use: (handler: (req: { url?: string }, res: { setHeader: (name: string, value: string) => void; statusCode: number; end: (body?: string) => void }, next: () => void) => void) => void } }) {
    server.middlewares.use((req, res, next) => {
      if ((req.url ?? "").split("?")[0] !== localDataRoute) {
        next();
        return;
      }

      void fs
        .readFile(localDataFile, "utf8")
        .then((contents) => {
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.statusCode = 200;
          res.end(contents);
        })
        .catch(() => {
          res.statusCode = 404;
          res.end();
        });
    });
  },
});

export default defineConfig({
  plugins: [react(), localDataPlugin()],
});
