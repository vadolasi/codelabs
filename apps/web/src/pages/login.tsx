import React from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

const schema = z.object({
  emailOrUsername: z.string(),
  password: z.string(),
})
type FormValues = z.infer<typeof schema>

const LoginPage: React.FC = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur"
  })

  const onSubmit = handleSubmit((data) => {
    console.log(data)
  })

  return (
    <div className="flex justify-center items-center h-screen">
      <form
        className="bg-white p-8 rounded-lg shadow-md"
        onSubmit={onSubmit}
      >
        <h1 className="text-2xl font-semibold mb-4">Login</h1>
        <div className="mb-4">
          <label className="block text-gray-700">Email or Username</label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-md p-2"
            {...register("emailOrUsername")}
          />
          {errors.emailOrUsername && (
            <p className="text-red-500 text-sm mt-1">{errors.emailOrUsername.message}</p>
          )}
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">Password</label>
          <input
            type="password"
            className="w-full border border-gray-300 rounded-md p-2"
            {...register("password")}
          />
          {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
        </div>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white rounded-md p-2"
        >
          Login
        </button>
      </form>
    </div>
  )
}

export default LoginPage
