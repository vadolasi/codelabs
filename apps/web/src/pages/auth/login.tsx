import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import Input from "../../components/Input"
import Button from "../../components/Button"
import { useMutation } from "@tanstack/react-query"
import client from "../../httpClient"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "react-hot-toast"
import { md5 } from "hash-wasm"
import useStore from "../../store"

const schema = z.object({
  emailOrUsername: z.string()
    .min(1, "Required field"),
  password: z.string()
    .min(1, "Required field")
})
type FormValues = z.infer<typeof schema>

const LoginPage: React.FC = () => {
  const setUser = useStore(state => state.setUser)
  const navigate = useNavigate()

  const { mutateAsync: login } = useMutation({
    mutationFn: async ({ emailOrUsername, password }: FormValues) => {
      const { error, data } = await client.api.auth.login.post({
        emailOrUsername: emailOrUsername,
        password: await md5(password)
      })

      if (error) {
        throw new Error(error.value as string)
      }

      return data
    },
    onSuccess: ({ email, username }) => {
      setUser({ email, username })
      navigate("/")
    }
  })

  const { mutateAsync: resendEmail } = useMutation({
    mutationFn: async (emailOrUsername: string) => {
      const { error } = await client.api.auth["resent-email-confirmation"].post({ emailOrUsername })

      if (error) {
        throw new Error(error.value as string)
      }
    }
  })

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur"
  })

  const onSubmit = ({ emailOrUsername, password }: FormValues) => {
    toast.promise(login({ emailOrUsername, password }), {
      loading: "Logging in...",
      success: "Logged in successfully",
      error: (error) => error.message === "Email not confirmed"
        ? (
          <>
            Email not confirmed.&ensp;
            <button
              type="button"
              onClick={() => toast.promise(resendEmail(emailOrUsername), {
                loading: "Resending email...",
                success: "Email confirmation resent",
                error: "Error resending email"
              })}
              className="text-cyan-500"
            >
              Resend
            </button>
          </>
        )
        : error.message
    })
  }

  return (
    <form
      className="p-8 rounded-lg shadow-md w-full md:w-1/2 lg:w-1/3 xl:w-1/4 bg-slate-800"
      onSubmit={handleSubmit(onSubmit)}
    >
      <h1 className="text-2xl font-semibold mb-4">Login</h1>
      <Input label="Email or Username" error={errors.emailOrUsername?.message} {...register("emailOrUsername")} />
      <Input label="Password" error={errors.password?.message} type="password" {...register("password")} />
      <Button type="submit">Login</Button>
      <p className="mt-4 text-center">
        Don't have an account? <a href="/auth/register" className="text-cyan-500">Register</a>
      </p>
      <p className="mt-4 text-center">
        <Link to="/auth/forgot-password" className="text-cyan-500">Forgot password?</Link>
      </p>
    </form>
  )
}

export default LoginPage
