import { Arg, Mutation, Query, Resolver } from "type-graphql"
import { Service } from "typedi"
import { Room } from "./room.model.ts"
import { RoomsService } from "./rooms.service.ts"

@Service()
@Resolver(Room)
export class RoomsResolver {
  constructor(private roomsService: RoomsService) {}

  @Mutation(returns => Room)
  async createRoom() {
    return await this.roomsService.createRoom()
  }

  @Query(returns => Room)
  async room(@Arg("id") id: string) {
    return await this.roomsService.getOne(id)
  }
}
