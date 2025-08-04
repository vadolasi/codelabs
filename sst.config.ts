/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
	app(input) {
		return {
			name: "codelabs",
			removal: input?.stage === "production" ? "retain" : "remove",
			protect: ["production"].includes(input?.stage),
			home: "aws",
			providers: {
				aws: {
					region: "sa-east-1"
				}
			}
		}
	},
	async run() {
		if ($dev) {
			new sst.x.DevCommand("DevServices", {
				dev: {
					command: "docker compose up"
				}
			})
		}

		const resendApiKeySecret = new sst.Secret("ResendApiKey")

		const vpc = new sst.aws.Vpc("CodelabsVPC")

		const bucket = new sst.aws.Bucket("CodelabsBucket")

		const database = new sst.aws.Postgres("CodelabsDatabase", {
			vpc,
			dev: {
				host: "localhost",
				database: "codelabs",
				username: "codelabs",
				password: "codelabs",
				port: 5432
			}
		})

		const redis = new sst.aws.Redis("CodelabsRedis", {
			engine: "valkey",
			vpc,
			dev: {
				host: "localhost",
				port: 6379,
				password: "codelabs"
			}
		})

		const cluster = new sst.aws.Cluster("CodelabsCluster", { vpc })
		new sst.aws.Service("CodelabsRealtimeServer", {
			cluster,
			image: {
				context: ".",
				dockerfile: "realtime-server/Dockerfile"
			},
			loadBalancer: {
				ports: [{ listen: "443/https", forward: "8080/http" }],
				domain: {
					name: "realtime.codelabs.unova.tech",
					dns: sst.aws.dns()
				}
			},
			dev: {
				command: "bun dev",
				directory: "./realtime-server"
			},
			architecture: "arm64",
			link: [database, redis]
		})

		new sst.aws.SvelteKit("CodelabsWeb", {
			path: "web/",
			domain: {
				name: "codelabs.unova.tech",
				dns: sst.aws.dns()
			},
			link: [bucket, database, redis, resendApiKeySecret],
			vpc,
			buildCommand: "bun run build",
			server: {
				architecture: "arm64",
				runtime: "nodejs22.x",
				loader: {
					".wasm": "binary"
				},
				layers: ["arn:aws:lambda:sa-east-1:858293832988:layer:bun:1"]
			},
			environment: {
				PUBLIC_SITE_URL: $dev
					? "http://localhost:5173"
					: "https://codelabs.unova.tech",
				PUBLIC_WEBSOCKET_URL: $dev
					? "ws://localhost:8080"
					: "wss://realtime.codelabs.unova.tech",
				NODE_ENV: $dev ? "development" : "production"
			}
		})
	}
})
