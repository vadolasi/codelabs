import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { sha256 } from "hash-wasm";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import Button from "../../components/Button";
import Input from "../../components/Input";
import client from "../../utils/httpClient";
import useStore from "../../utils/store";

const schema = z.object({
  email: z.string().min(1, "Required field"),
  password: z.string().min(1, "Required field"),
});
type FormValues = z.infer<typeof schema>;

const LoginPage: React.FC = () => {
  const setUser = useStore((state) => state.setUser);
  const navigate = useNavigate();

  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/";

  const { mutateAsync: login } = useMutation({
    mutationFn: async ({ email, password }: FormValues) => {
      const { error, data } = await client.api.auth.login.post({
        email,
        password: await sha256(password),
      });

      if (error) {
        throw new Error(error.value as string);
      }

      return data;
    },
    onSuccess: ({ email, firstName, lastName, id }) => {
      setUser({ email, firstName, lastName, id });
      navigate(redirect);
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
  });

  const onSubmit = ({ email, password }: FormValues) => {
    toast.promise(login({ email, password }), {
      loading: "Logging in...",
      success: "Logged in successfully",
      error: (error) => {
        navigate("/auth/confirm-email", { state: { email } });

        return error.message;
      },
    });
  };

  return (
    <form
      className="p-8 rounded-lg shadow-md w-full md:w-1/2 lg:w-1/3 xl:w-1/4 bg-slate-800"
      onSubmit={handleSubmit(onSubmit)}
    >
      <h1 className="text-2xl font-semibold mb-4">Login</h1>
      <Input
        label="Email"
        error={errors.email?.message}
        {...register("email")}
      />
      <Input
        label="Password"
        error={errors.password?.message}
        type="password"
        {...register("password")}
      />
      <Button type="submit">Login</Button>
      <p className="mt-4 text-center">
        Don't have an account?{" "}
        <a href="/auth/register" className="text-cyan-500">
          Register
        </a>
      </p>
      <p className="mt-4 text-center">
        <Link to="/auth/forgot-password" className="text-cyan-500">
          Forgot password?
        </Link>
      </p>
    </form>
  );
};

export default LoginPage;
