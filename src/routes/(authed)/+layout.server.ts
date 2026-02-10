import { requireLogin } from "$lib/auth"
import type { LayoutServerLoad } from "./$types"

export const load: LayoutServerLoad = async () => {
  const user = requireLogin()

  return {
    user
  }
}
