export default {
	apps: [
		{
			name: "app",
			script: "index.ts",
			interpreter: "bun",
			env: {
				PATH: `${process.env.HOME}/.bun/bin:${process.env.PATH}`,
				DOMAIN: process.env.DOMAIN || "localhost:3000"
			}
		}
	]
}
