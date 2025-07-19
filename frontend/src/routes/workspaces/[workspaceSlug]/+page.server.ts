export function load({ setHeaders }) {
	setHeaders({
		"Cross-Origin-Embedder-Policy": "require-corp",
		"Cross-Origin-Opener-Policy": "same-origin"
	})
}
