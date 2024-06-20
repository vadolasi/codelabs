import { type Static, Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

const envSchema = Type.Object({
  NODE_ENV: Type.Optional(
    Type.Union([Type.Literal("DEVELOPMENT"), Type.Literal("PRODUCTION")], {
      default: "DEVELOPMENT",
    }),
  ),
  JWT_SECRET: Type.String(),
  RESEND_API_KEY: Type.String(),
  URL: Type.String(),
  PASSWORD_PEPPER: Type.String(),
  COOKIE_SECRET_1: Type.String(),
  COOKIE_SECRET_2: Type.String(),
  COOKIE_SECRET_3: Type.String(),
});

export type Env = Static<typeof envSchema>;

const C = TypeCompiler.Compile(envSchema);

const envValue = {
  NODE_ENV: process.env.NODE_ENV,
  JWT_SECRET: process.env.JWT_SECRET,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  URL: process.env.URL,
  PASSWORD_PEPPER: process.env.PASSWORD_PEPPER,
  COOKIE_SECRET_1: process.env.COOKIE_SECRET_1,
  COOKIE_SECRET_2: process.env.COOKIE_SECRET_2,
  COOKIE_SECRET_3: process.env.COOKIE_SECRET_3,
};

if (!C.Check(envValue)) {
  throw new Error(
    JSON.stringify(
      [...C.Errors(envValue)].map(({ path, message }) => ({ path, message })),
    ),
  );
}

export default envValue as Env;
