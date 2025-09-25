import { Packr } from "msgpackr"
import type { Packet } from "./packet-format"

const msgpack = new Packr({
	bundleStrings: true
})

export class Encoder {
	public encode(packet: Packet): [Buffer] {
		const encoded = msgpack.pack(packet)
		return [encoded]
	}
}
