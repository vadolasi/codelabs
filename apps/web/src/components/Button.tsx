import { forwardRef } from "react"
import cn from "../cn"

const Button = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(({ className, ...props }, ref) => {
  return <button ref={ref} className={cn("w-full bg-blue-500 text-white rounded-md p-2", className)} {...props} />
})

export default Button
