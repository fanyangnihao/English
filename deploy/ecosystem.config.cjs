const path = require("node:path");

const projectRoot = "/www/wwwroot/47.108.199.245";
const serverRoot = path.join(projectRoot, "current", "server");

module.exports = {
  apps: [
    {
      name: "server",
      cwd: serverRoot,
      script: path.join(serverRoot, "dist/apps/server/apps/server/src/main.js"),
      instances: 2,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "ai",
      cwd: serverRoot,
      script: path.join(serverRoot, "dist/apps/ai/apps/ai/src/main.js"),
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
