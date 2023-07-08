import type { AttributifyNames } from "@unocss/preset-attributify"

type Prefix = "_"

declare module "preact" {
  namespace JSX {
    interface HTMLAttributes extends Partial<Record<AttributifyNames<Prefix>, string>> {}
  }
}
