const path = require("node:path")

module.exports = {
	apps: [
		{
			name: "app",
			script: "bun",
			args: path.join(__dirname, "index.ts"),
			interpreter: "none",
			env: {
				PATH: `${process.env.HOME}/.bun/bin:${process.env.PATH}`,
				DOMAIN: process.env.DOMAIN || "localhost:3000"
			}
		}
	]
}
