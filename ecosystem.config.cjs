module.exports = {
  apps: [
    {
      name: 'smash-storefront',
      cwd: __dirname,
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      exec_mode: 'fork',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        // Behind OpenLiteSpeed/CyberPanel the proxy appends the real client IP
        // to x-forwarded-for; rate limiting reads the right-most entry.
        // Behind Cloudflare, set TRUSTED_IP_HEADER=cf-connecting-ip instead.
        // TRUSTED_IP_HEADER: 'cf-connecting-ip',
      },
      // Restart (instead of slowly swelling) if a leak ever develops.
      max_memory_restart: '900M',
      // Give in-flight requests time to finish on reload/stop.
      kill_timeout: 10000,
      // Don't crash-loop forever if the app can't boot.
      min_uptime: '20s',
      max_restarts: 10,
      restart_delay: 3000,
      time: true,
      merge_logs: true,
    },
  ],
}
