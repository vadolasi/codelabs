import { Hocuspocus } from "@hocuspocus/server"
import { config } from "dotenv"
import jwt from "jsonwebtoken"

config()

const JWT_SECRET = process.env.JWT_SECRET!

interface TokenData {
  userId: string
  roomId: string
  roles: string[]
}

const server = new Hocuspocus({
  port: 8001,
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

server.listen()
