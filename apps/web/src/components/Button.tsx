import type { JSX } from "preact/compat"

export default function Button(props: JSX.HTMLAttributes<HTMLButtonElement>) {
  return <button _p="2" _rounded="lg" _border="0" {...props} />
}
