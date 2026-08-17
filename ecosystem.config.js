module.exports = {
      apps: [
        {
          name: "Library-Notifications",
          script: "server/server.js",
          cwd: "/home/bpio07/Library-Notifications",
          env: {
            NODE_ENV: "production",
            SERVER_PORT: "3002",
          },
        },
      ],
    };
    