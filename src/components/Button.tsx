import type { FunctionComponent } from "preact"
import type { JSX } from "preact/jsx-runtime"

const Button: FunctionComponent<JSX.HTMLAttributes<HTMLButtonElement>> = (props) => {
  return <button _p="2" _rounded="lg" _border="0" {...props} />
}

export default Button
