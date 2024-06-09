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

const schema = z.object({
  email: z.string()
    .min(1, "Required field")
    .email("Invalid email address"),
  username: z.string()
    .min(1, "Required field")
    .min(3, "Minimum of 3 characters")
    .max(20, "Maximum of 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers and underscores"),
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

const LoginPage: React.FC = () => {
  const navigate = useNavigate()

  const { mutateAsync } = useMutation({
    mutationFn: async ({ email, username, password }: Omit<FormValues, "passwordConfirmation">) => {
      const { error } = await client.api.auth.register.post({
        email,
        username,
        password: await md5(password)
      })

      if (error) {
        throw new Error(error.value as string)
      }
    },
    onSuccess: () => {
      navigate("/auth/email-sended")
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

  const onSubmit = ({ email, username, password }: FormValues) => {
    toast.promise(mutateAsync({ email, username, password }), {
      loading: "Registering...",
      success: "Registered successfully",
      error: (error) => error.message
    })
  }

  return (
    <form
      className="p-8 rounded-lg shadow-md w-full md:w-1/2 lg:w-1/3 xl:w-1/4 bg-slate-800"
      onSubmit={handleSubmit(onSubmit)}
    >
      <h1 className="text-2xl font-semibold mb-4">Register</h1>
      <Input label="Email" error={errors.email?.message} {...register("email")} />
      <Input label="Username" error={errors.username?.message} {...register("username")} />
      <Input label="Password" error={errors.password?.message} type="password" {...register("password")} />
      <Input label="Confirm Password" error={errors.passwordConfirmation?.message} type="password" {...register("passwordConfirmation")} />
      <Button type="submit">Register</Button>
      <p className="mt-4 text-center">
        Already have an account? <Link to="/auth/login" className="text-cyan-500">Login</Link>
      </p>
    </form>
  )
}

export default LoginPage
