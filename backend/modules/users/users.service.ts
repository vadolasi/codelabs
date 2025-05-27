export function generateOTPCode(): string {
	const array = new Uint32Array(1)
	crypto.getRandomValues(array)

	const randomNum = array[0] % 1_000_000

	return randomNum.toString().padStart(6, "0")
}
