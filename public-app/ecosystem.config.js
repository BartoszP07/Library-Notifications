module.exports = {
	apps: [
	 {
           name: "Library-Public",
  	   script: "public-app/server.js",
           cwd: "/home/bpio07/Library-Notifications",
           env: {
    		NODE_ENV: "production",
   		PUBLIC_PORT: "3004"
		},
	  },
	],
};


