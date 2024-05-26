export class HTTPError extends Error {
  constructor(public code: number, public message: string) {
    super(message)
  }
}
