import { valibotResolver } from "@hookform/resolvers/valibot";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import * as v from "valibot";
import { useLocation, useSearch } from "wouter";
import Button from "../../components/Button";
import Input from "../../components/Input";
import client from "../../utils/httpClient";

const schema = v
  .object({
    password: v.pipe(
      v.string(),
      v.minLength(1, "Required field"),
      v.minLength(8, "Mínimo de 8 caracteres"),
      v.regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/,
        "Use at least one lowercase letter, one uppercase letter, one number and one special character",
      ),
    ),
    passwordConfirmation: v.pipe(v.string(), v.minLength(1, "Required field")),
  })
  .check((data) => data.password === data.passwordConfirmation, {
    message: "As senhas não coincidem",
    path: ["passwordConfirmation"],
  });
type FormValues = v.InferOutput<typeof schema>;

// million-ignore
const ResetPasswordPage: React.FC = () => {
  const params = useSearch();
  const token = params.get("token") ?? "";

  const [, navigate] = useLocation();

  const { mutateAsync: resetPassword } = useMutation({
    mutationFn: async (password: string) =>
      client.api.auth["reset-password"]({ token }).post({
        password,
      }),
    onError: () => {
      toast.error("Failed to reset password");
    },
    onSuccess: () => {
      toast.success("Password reset");
      navigate("/auth/login");
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: valibotResolver(schema),
    mode: "onBlur",
  });

  const onSubmit = ({ password }: FormValues) => {
    toast.promise(resetPassword(password), {
      loading: "Logging in...",
      success: "Logged in successfully",
      error: (error) => error.message,
    });
  };

  return (
    <form
      className="p-8 rounded-lg shadow-md w-full md:w-1/2 lg:w-1/3 xl:w-1/4 bg-slate-800"
      onSubmit={handleSubmit(onSubmit)}
    >
      <h1 className="text-2xl font-semibold mb-4">Login</h1>
      <Input
        label="Password"
        error={errors.password?.message}
        type="password"
        {...register("password")}
      />
      <Input
        label="Confirm Password"
        error={errors.passwordConfirmation?.message}
        type="password"
        {...register("passwordConfirmation")}
      />
      <Button type="submit">Login</Button>
    </form>
  );
};

export default ResetPasswordPage;
