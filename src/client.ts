import { Client, cacheExchange, fetchExchange } from "urql"

export const client = new Client({
  url: "/graphql",
  exchanges: [
    cacheExchange,
    /*
    authExchange(async utils => {
      return {
        didAuthError: (error) => {
          return checkError(error, "jwt expired")
        },
        addAuthToOperation(operation) {
          return operation
        },
        async refreshAuth() {
          const result = await utils.mutate(refreshTokenMutation, {})

          if (checkError(result.error!, "Refresh token expired")) {
            Router.push("/login")
          }
        }
      }
    }),
    */
    fetchExchange
  ]
})
