import "reflect-metadata"
import { App, HttpRequest, HttpResponse } from "uWebSockets.js"
import { createYoga } from "graphql-yoga"
import { makeBehavior } from "graphql-ws/lib/use/uWebSockets"
import { ExecutionArgs, execute, subscribe, printSchema } from "graphql"
import { renderGraphiQL } from "@graphql-yoga/render-graphiql"
import { RoomsResolver } from "./modules/rooms/rooms.resolver.ts"
import { buildSchema } from "type-graphql"
import { Container } from "typedi"
import { writeFile } from "fs/promises"
import { config } from "dotenv"

config()

interface ServerContext {
  req: HttpRequest
  res: HttpResponse
}

const schema = await buildSchema({
  resolvers: [RoomsResolver],
  container: Container
})

if (process.env.NODE_ENV !== "production") {
  await writeFile("./src/schema.graphql", printSchema(schema))
}

export const yoga = createYoga<ServerContext>({
  schema,
  graphiql: {
    subscriptionsProtocol: "WS"
  },
  renderGraphiQL
})

type EnvelopedExecutionArgs = ExecutionArgs & {
  rootValue: {
    execute: typeof execute
    subscribe: typeof subscribe
  }
}

const wsHandler = makeBehavior({
  execute: (args) => (args as EnvelopedExecutionArgs).rootValue.execute(args),
  subscribe: (args) =>
    (args as EnvelopedExecutionArgs).rootValue.subscribe(args),
  onSubscribe: async (ctx, msg) => {
    const { schema, execute, subscribe, contextFactory, parse, validate } =
      yoga.getEnveloped(ctx)

    const args: EnvelopedExecutionArgs = {
      schema,
      operationName: msg.payload.operationName,
      document: parse(msg.payload.query),
      variableValues: msg.payload.variables,
      contextValue: await contextFactory(),
      rootValue: {
        execute,
        subscribe
      }
    }

    const errors = validate(args.schema, args.document)
    if (errors.length) return errors
    return args
  }
})

App()
  .any("/*", yoga)
  .ws(yoga.graphqlEndpoint, wsHandler)
  .listen(8000, () => {
    console.log(`Server is running on http://localhost:8000`)
  })
