module.exports = {
	apps: [
	 {
           name: "Library-Notifications",
  	   script: "public-app/server.js",
           cwd: "/home/bpio07/Library-Notifications",
           env: {
    		NODE_ENV: "production",
   		SERVER_PORT: "3005",
		PRIVATE_PORT: "3001"
		},
	  },
	],
};
