import type { Config } from "drizzle-kit";

const config: Config = {
  schema: "./src/db/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: "db.sqlite",
  },
};

export default config;
