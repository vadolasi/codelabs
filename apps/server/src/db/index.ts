import { drizzle } from "drizzle-orm/connect";

import env from "../env";
import * as schema from "./schema";

// @ts-ignore
const db = await drizzle("postgres-js", {
  connection: env.DATABASE_URL,
  schema,
});

export default db;
