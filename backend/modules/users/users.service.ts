export function generateOTPCode(): string {
	const array = new Uint32Array(1)
	crypto.getRandomValues(array)

	const randomNum = typeof array[0] === "number" ? array[0] % 1_000_000 : 0

	return randomNum.toString().padStart(6, "0")
}
