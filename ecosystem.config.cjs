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
      script: "pnpm",
      args: "start"
    },
    {
      name: "ws-backend",
      cwd: "apps/ws-backend",
      script: "pnpm",
      args: "start"
    }
  ]
};
