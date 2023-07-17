import type { FunctionComponent } from "preact"
import type { JSX } from "preact/jsx-runtime"

const Button: FunctionComponent<JSX.HTMLAttributes<HTMLButtonElement>> = (props) => {
  return <button
    _bg="blue-700 opacity-0 hover:opacity-25"
    _border="0"
    _text="2xl"
    _flex="~"
    _items="center"
    _justify="center"
    class="aspect-square"
    {...props}
  />
}

export default Button
