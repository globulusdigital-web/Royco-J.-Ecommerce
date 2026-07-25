const clustered = Boolean(process.env.DATABASE_URL);

module.exports = {
  apps: [{
    name: "royco-jewellers",
    script: "./local-server/app.mjs",
    cwd: __dirname,
    // The JSON development store is intentionally single-process. Postgres-backed
    // production runs fan out safely across all CPU cores.
    exec_mode: clustered ? "cluster" : "fork",
    instances: clustered ? "max" : 1,
    autorestart: true,
    watch: false,
    max_memory_restart: "450M",
    exp_backoff_restart_delay: 1_000,
    restart_delay: 3_000,
    max_restarts: 10,
    min_uptime: "10s",
    kill_timeout: 8000,
    listen_timeout: 10000,
    shutdown_with_message: true,
    merge_logs: true,
    time: true,
    env: {
      NODE_ENV: "production",
      HOST: "0.0.0.0",
      PORT: 4173,
    },
  }],
};
