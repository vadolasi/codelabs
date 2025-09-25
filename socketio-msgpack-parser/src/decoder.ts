import { Unpackr } from "msgpackr"
import { EventEmitter } from "tseep"
import { type Packet, PacketType } from "./packet-format"

const msgpack = new Unpackr({
	bundleStrings: true
})

type DecoderEvents = {
	decoded: (packet: Packet) => void
}

export class Decoder extends EventEmitter<DecoderEvents> {
	public add(buffer: Buffer) {
		try {
			const decoded = msgpack.unpack(buffer) as Packet
			this.validatePacket(decoded)
			this.emit("decoded", decoded)
		} catch (err) {
			throw new Error("Could not parse packet")
		}
	}

	// biome-ignore lint/suspicious/noExplicitAny: Don't have a better type for this
	private validatePacket(packet: any): void {
		const isObject =
			typeof packet === "object" && packet !== null && !Array.isArray(packet)
		if (!isObject) {
			throw new Error("invalid packet")
		}

		const isValidType =
			typeof packet.type === "number" &&
			packet.type >= PacketType.CONNECT &&
			packet.type <= PacketType.CONNECT_ERROR
		if (!isValidType) {
			throw new Error("invalid packet type")
		}

		if (typeof packet.nsp !== "string") {
			throw new Error("invalid packet namespace")
		}

		if (packet.id !== undefined && typeof packet.id !== "number") {
			throw new Error("invalid packet id")
		}

		if (!this.isDataValid(packet)) {
			throw new Error("invalid packet payload")
		}
	}

	private isDataValid(packet: Packet): boolean {
		switch (packet.type) {
			case PacketType.CONNECT:
				return packet.data === undefined || typeof packet.data === "object"
			case PacketType.DISCONNECT:
				return packet.data === undefined
			case PacketType.CONNECT_ERROR:
				return (
					typeof packet.data === "string" || typeof packet.data === "object"
				)
			default:
				return Array.isArray(packet.data)
		}
	}

	public destroy() {
		this.removeAllListeners()
	}
}
