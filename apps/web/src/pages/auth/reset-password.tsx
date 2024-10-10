import { valibotResolver } from "@hookform/resolvers/valibot";
import { Button, CardBody, CardHeader, Input } from "@nextui-org/react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import * as v from "valibot";
import { useLocation, useSearch } from "wouter";
import AuthLayout from "../../layouts/auth";
import client from "../../utils/httpClient";

const schema = v.pipe(
  v.object({
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
  }),
  v.forward(
    v.partialCheck(
      [["password"], ["passwordConfirmation"]],
      (input) => input.password === input.passwordConfirmation,
      "The passwords do not match.",
    ),
    ["passwordConfirmation"],
  ),
);

type FormValues = v.InferOutput<typeof schema>;

const ResetPasswordPage: React.FC = () => {
  const params = new URLSearchParams(useSearch());
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
    <AuthLayout>
      <CardHeader>
        <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white">
          Reset your password
        </h1>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit(onSubmit)}>
          <h1 className="text-2xl font-semibold mb-4">Set password</h1>
          <Input
            label="Password"
            isInvalid={Boolean(errors.password)}
            errorMessage={errors.password?.message}
            type="password"
            {...register("password")}
          />
          <Input
            label="Confirm Password"
            isInvalid={Boolean(errors.passwordConfirmation)}
            errorMessage={errors.passwordConfirmation?.message}
            type="password"
            {...register("passwordConfirmation")}
          />
          <Button type="submit" color="primary">
            Set password
          </Button>
        </form>
      </CardBody>
    </AuthLayout>
  );
};

export default ResetPasswordPage;
