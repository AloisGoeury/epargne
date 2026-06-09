import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
var localDataRoute = "/__local-data__/epargne-data.json";
var localDataFile = fileURLToPath(new URL("./.local/epargne-data.json", import.meta.url));
var localDataPlugin = function () { return ({
    name: "local-data-plugin",
    configureServer: function (server) {
        server.middlewares.use(function (req, res, next) {
            var _a;
            if (((_a = req.url) !== null && _a !== void 0 ? _a : "").split("?")[0] !== localDataRoute) {
                next();
                return;
            }
            void fs
                .readFile(localDataFile, "utf8")
                .then(function (contents) {
                res.setHeader("Content-Type", "application/json; charset=utf-8");
                res.statusCode = 200;
                res.end(contents);
            })
                .catch(function () {
                res.statusCode = 404;
                res.end();
            });
        });
    },
}); };
export default defineConfig({
    plugins: [react(), localDataPlugin()],
});
