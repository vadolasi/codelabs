import { Arg, Mutation, Query, Resolver } from "type-graphql"
import { Service } from "typedi"
import { Room } from "./room.model.js"
import { RoomsService } from "./rooms.service.js"

@Service()
@Resolver(Room)
export class RoomsResolver {
  constructor(private roomsService: RoomsService) {}

  @Mutation(_returns => Room)
  async createRoom(
    @Arg("username") username: string
  ) {
    return await this.roomsService.createRoom(username)
  }

  @Mutation(_returns => String)
  async joinRoom(
    @Arg("id") id: string,
    @Arg("username") username: string
  ) {
    return await this.roomsService.getRoomAccessToken(username, id)
  }

  @Query(_returns => [Room])
  async getRooms() {
    return []
  }
}
