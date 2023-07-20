import "reflect-metadata"
import { createYoga } from "graphql-yoga"
import { printSchema } from "graphql"
import { RoomsResolver } from "./modules/rooms/rooms.resolver.js"
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
import { Logger } from "@hocuspocus/extension-logger"
import { Database } from "@hocuspocus/extension-database"
import { PrismaService } from "./prisma.js"
import { YKeyValue } from "y-utility/y-keyvalue"
import ViteExpress from "vite-express"

config()

const JWT_SECRET = process.env.JWT_SECRET!

interface TokenData {
  userId: string
  roomId: string
  roles: string[]
}

config()

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

export const yoga = createYoga({
  schema,
  plugins: [useGraphQlJit()]
})

const prisma = Container.get(PrismaService)

const yjsServer = Server.configure({
  extensions: [
    new Logger(),
    new Database({
      fetch: async ({ documentName }) => {
        const document = await prisma.document.findUnique({ where: { name: documentName } })

        if (document) {
          return new Uint8Array(document.data.buffer)
        }

        return null
      },
      store: async ({ documentName, state }) => {
        await prisma.document.upsert({
          where: {
            name: documentName
          },
          create: {
            name: documentName,
            data: state
          },
          update: {
            data: state
          }
        })
      }
    })
  ],
  async onAuthenticate(data) {
    const { documentName, token } = data

    const { roomId, roles } = await new Promise<TokenData>(resolve => {
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
  },
  async onLoadDocument(data) {
    if (data.documentName.endsWith("__files__")) {
      new YKeyValue(data.document.getArray<any>("files")).set("__main__", {
        id: "__main__",
        name: "",
        parent: "",
        type: "folder",
        children: []
      })

      return data.document
    }
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
  yjsServer.handleConnection(websocket, request)
})

const server = app.listen(3000, "0.0.0.0", () =>
  console.log("Server is listening on http://localhost:3000")
)

ViteExpress.bind(app as any, server)
