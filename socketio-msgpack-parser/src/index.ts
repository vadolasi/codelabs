import { Decoder } from "./decoder"
import { Encoder } from "./encoder"
import { PacketType } from "./packet-format"

export const protocol = 5

export { Encoder, Decoder, PacketType }

export default {
	protocol,
	Encoder,
	Decoder,
	PacketType
}
