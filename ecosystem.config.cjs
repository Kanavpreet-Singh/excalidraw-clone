module.exports = {
  apps: [
    {
      name: "excalidraw-frontend",
      cwd: "apps/excalidraw-frontend",
      script: "pnpm",
      args: "start"
    },
    {
      name: "http-backend",
      cwd: "apps/http-backend",
      script: "dist/index.js"
    },
    {
      name: "ws-backend",
      cwd: "apps/ws-backend",
      script: "dist/index.js"
    }
  ]
};
