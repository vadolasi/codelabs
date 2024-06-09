import { forwardRef } from "react"
import cn from "../cn"

const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label: string, error?: string }>(({ label, error, className, ...props }, ref) => {
  return (
    <div className="flex flex-col w-full mb-4">
      <label htmlFor={props.name} className="text-sm font-medium">{label}</label>
      <input ref={ref} className={cn("rounded p-2", error ? "border-red-500" : "border-gray-600", className)} {...props} />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  )
})

export default Input
