import { error } from "@sveltejs/kit"
import type { LayoutServerLoad } from "./$types"

export const load: LayoutServerLoad = async ({ locals }) => {
  if (locals.user?.role !== "admin") {
    return error(404, {
      message: "Not found"
    })
  }
}
