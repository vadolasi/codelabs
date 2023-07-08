import { PrismaClient } from "@prisma/client"
import { Service } from "typedi"

@Service()
export class PrismaService extends PrismaClient {
  constructor() {
    super()
  }
}
