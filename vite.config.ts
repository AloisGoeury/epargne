import fs from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const localDataRoute = "/__local-data__/epargne-data.json";
const localDataFile = fileURLToPath(new URL("./.local/epargne-data.json", import.meta.url));

const localDataPlugin = () => ({
  name: "local-data-plugin",
  configureServer(server: { middlewares: { use: (handler: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void } }) {
    server.middlewares.use((req, res, next) => {
      if ((req.url ?? "").split("?")[0] !== localDataRoute) {
        next();
        return;
      }

      if (req.method === "PUT") {
        const chunks = [];
        req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        req.on("end", () => {
          void (async () => {
            try {
              const raw = Buffer.concat(chunks).toString("utf8");
              const parsed = JSON.parse(raw);
              await fs.mkdir(fileURLToPath(new URL("./.local", import.meta.url)), { recursive: true });
              await fs.writeFile(localDataFile, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
              res.statusCode = 204;
              res.end();
            } catch {
              res.statusCode = 400;
              res.end("Invalid JSON");
            }
          })();
        });
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
