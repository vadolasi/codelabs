import { Service } from "typedi"
import { PrismaService } from "../../prisma.js"
import { GraphQLError } from "graphql"
import jwt from "jsonwebtoken"
import { customAlphabet } from "nanoid/async"

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 10)

@Service()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService
  ) {}

  async createRoom(username: string) {
    return await this.prisma.room.create({ data: { id: await nanoid(), owner: username } })
  }

  async getRoomAccessToken(username: string, roomId: string) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } })

    if (!room) {
      throw new GraphQLError("Room not found")
    }

    let mainRoles: string[] = [`user|${username}:write`, "__main__:read"]
    if (room.owner === username) {
      mainRoles = ["*:write"]
    }

    return jwt.sign({ userId: username, roomId, roles: mainRoles }, process.env.JWT_SECRET!)
  }

  async getAll() {
    return this.prisma.room.findMany()
  }
}
