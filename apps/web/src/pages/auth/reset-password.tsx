import { useMutation, useSuspenseQuery } from "@tanstack/react-query"
import { Navigate, useSearchParams, useNavigate } from "react-router-dom"
import client from "../../httpClient"
import toast from "react-hot-toast"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import Input from "../../components/Input"
import Button from "../../components/Button"
import { md5 } from "hash-wasm"

const schema = z.object({
  password: z.string()
    .min(1, "Required field")
    .min(8, "Mínimo de 8 caracteres")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/, "Use at least one lowercase letter, one uppercase letter, one number and one special character"),
  passwordConfirmation: z.string()
    .min(1, "Required field")
})
  .refine(data => data.password === data.passwordConfirmation, {
    message: "As senhas não coincidem",
    path: ["passwordConfirmation"]
  })
type FormValues = z.infer<typeof schema>

const ConfirmEmailPage: React.FC = () => {
  const [params] = useSearchParams()
  const token = params.get("token") ?? ""

  const navigate = useNavigate()

  const { error } = useSuspenseQuery({
    queryKey: ["check-password-reset-token", { token }],
    queryFn: () => client.api.auth["check-forgot-password-token"].post({ token }),
  })

  const { mutateAsync: resetPassword } = useMutation({
    mutationFn: async (password: string) => client.api.auth["reset-password"].post({ token, password: await md5(password) }),
    onError: () => {
      toast.error("Failed to reset password")
    },
    onSuccess: () => {
      toast.success("Password reset")
      navigate("/auth/login")
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

  const onSubmit = ({ password }: FormValues) => {
    toast.promise(resetPassword(password), {
      loading: "Logging in...",
      success: "Logged in successfully",
      error: (error) => error.message
    })
  }

  if (error) {
    toast.error("Invalid token")
    return <Navigate to="/auth/login" />
  }

  return (
    <form
      className="p-8 rounded-lg shadow-md w-full md:w-1/2 lg:w-1/3 xl:w-1/4 bg-slate-800"
      onSubmit={handleSubmit(onSubmit)}
    >
      <h1 className="text-2xl font-semibold mb-4">Login</h1>
      <Input label="Password" error={errors.password?.message} type="password" {...register("password")} />
      <Input label="Confirm Password" error={errors.passwordConfirmation?.message} type="password" {...register("passwordConfirmation")} />
      <Button type="submit">Login</Button>
    </form>
  )
}

export default ConfirmEmailPage
