import { forwardRef } from "react";
import cn from "../utils/cn";

const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    error?: string;
  }
>(({ label, error, className, ...props }, ref) => {
  return (
    <div className="flex flex-col w-full mb-4">
      <label
        htmlFor={props.name}
        className={cn(
          "block mb-2 text-sm font-medium text-gray-900 dark:text-white",
          error && "text-red-700 dark:text-red-500",
        )}
      >
        {label}
      </label>
      <input
        ref={ref}
        className={cn(
          "bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500",
          error &&
            "bg-red-50 border-red-500 text-red-900 placeholder-red-700 focus:ring-red-500 focus:border-red-500 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500",
          className,
        )}
        {...props}
      />
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-500">{error}</p>
      )}
    </div>
  );
});

export default Input;
