import { Service } from "typedi"
import { PrismaService } from "../../prisma.ts"
import { GraphQLError } from "graphql"

@Service()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService
  ) {}

  async createRoom() {

  }

  async getAll() {
    return this.prisma.room.findMany()
  }

  async getOne(id: string) {
    const room = this.prisma.room.findUnique({ where: { id } })

    if (!room) {
      throw new GraphQLError("Room not found")
    }

    return room
  }
}
