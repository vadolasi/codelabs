import "reflect-metadata"
import { HttpRequest, HttpResponse } from "uWebSockets.js"
import { createYoga } from "graphql-yoga"
import { printSchema } from "graphql"
import { RoomsResolver } from "./modules/rooms/rooms.resolver.ts"
import { buildSchema } from "type-graphql"
import { Container } from "typedi"
import { writeFile } from "fs/promises"
import { config } from "dotenv"
import { useGraphQlJit } from "@envelop/graphql-jit"
import express from "express"
import expressWebsockets from "express-ws"
import helmet from "helmet"
import cors from "cors"
import morgan from "morgan"
import { Server } from "@hocuspocus/server"
import jwt from "jsonwebtoken"

config()

const JWT_SECRET = process.env.JWT_SECRET!

interface TokenData {
  userId: string
  roomId: string
  roles: string[]
}

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

const { app } = expressWebsockets(express())
app.use(cors())
app.use(helmet())
app.use(morgan("tiny"))

export const yoga = createYoga<ServerContext>({
  schema,
  plugins: [useGraphQlJit()]
})

const server = Server.configure({
  async onAuthenticate(data) {
    const { documentName, token } = data

    const { roomId, roles, userId } = await new Promise<TokenData>(resolve => {
      jwt.verify(token, JWT_SECRET, (err, payload) => {
        if (err) throw err
        resolve(payload as TokenData)
      })
    })

    const [room, document] = documentName.split(":")

    if (room == roomId) {
      const availableRoles = roles
        .filter(role => role.startsWith(document) || role.startsWith("*"))
        .map(role => role.split(":")[1])

      if (availableRoles.includes("write")) {
        return
      } else if (availableRoles.includes("read")) {
        data.connection.readOnly = true
        return
      }
    }

    throw new Error("Not authorized!")
  }
})

const yogaRouter = express.Router()

yogaRouter.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "style-src": ["'self'", 'unpkg.com'],
        "script-src": ["'self'", 'unpkg.com', "'unsafe-inline'"],
        "img-src": ["'self'", 'raw.githubusercontent.com']
      }
    }
  })
)
// @ts-ignore
yogaRouter.use(yoga)

app.use(yoga.graphqlEndpoint, yogaRouter)

app.ws("/", (websocket, request) => {
  server.handleConnection(websocket, request)
})

app.listen(8000, () => {
  console.log("Running a GraphQL API server at http://localhost:8000/graphql")
})
