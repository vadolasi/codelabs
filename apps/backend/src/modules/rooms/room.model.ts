import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
export class Room {
  @Field(_type => ID)
  id: string
}
