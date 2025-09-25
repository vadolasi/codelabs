export enum PacketType {
	CONNECT = 0,
	DISCONNECT = 1,
	EVENT = 2,
	ACK = 3,
	CONNECT_ERROR = 4
}

export interface Packet {
	type: PacketType
	nsp: string
	data?: unknown
	id?: number
}
