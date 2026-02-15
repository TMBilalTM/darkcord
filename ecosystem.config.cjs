module.exports = {
  apps: [
    {
      name: 'darkcord-server',
      script: 'server/index.ts',
      interpreter: 'node_modules/.bin/tsx',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        DB_PATH: './data/darkcord.db',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      time: true,
    },
  ],
}
