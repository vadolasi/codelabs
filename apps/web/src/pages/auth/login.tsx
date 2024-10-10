import { valibotResolver } from "@hookform/resolvers/valibot";
import {
  Button,
  CardBody,
  CardHeader,
  Checkbox,
  Input,
  Link,
} from "@nextui-org/react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import * as v from "valibot";
import { useLocation, useSearch } from "wouter";
import PasswordInput from "../../components/PasswordInput";
import AuthLayout from "../../layouts/auth";
import client from "../../utils/httpClient";
import useStore from "../../utils/store";

const schema = v.object({
  email: v.pipe(v.string(), v.minLength(1, "Required field")),
  password: v.pipe(v.string(), v.minLength(1, "Required field")),
});
type FormValues = v.InferOutput<typeof schema>;

const LoginPage: React.FC = () => {
  const setUser = useStore((state) => state.setUser);
  const [, navigate] = useLocation();

  const params = new URLSearchParams(useSearch());
  const redirect = params.get("redirect") || "/";

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<FormValues>({
    resolver: valibotResolver(schema),
    mode: "onBlur",
  });

  const onSubmit = ({ email, password }: FormValues) => {
    login({ email, password });
  };

  const email = watch("email");

  const { mutate: login, isPending } = useMutation({
    mutationFn: async ({ email, password }: FormValues) => {
      const { error, data } = await client.api.auth.login.post({
        email,
        password,
      });

      if (error) {
        throw new Error(error.value as string);
      }

      return data;
    },
    onSuccess: ({ email, firstName, lastName, id, picture }) => {
      setUser({ email, firstName, lastName, id, picture });
      navigate(`~${redirect}`);
    },
    onError: (error) => {
      toast.error(error.message);

      if (error.message === "Email not confirmed") {
        navigate("/auth/confirm-email", { state: { email } });
      }
    },
  });

  return (
    <AuthLayout>
      <CardHeader>
        <h1 className="text-xl font-bold leading-tight tracking-tight md:text-2xl">
          Sign in to your account
        </h1>
      </CardHeader>
      <CardBody>
        <form
          className="space-y-4 md:space-y-6"
          onSubmit={handleSubmit(onSubmit)}
        >
          <Input
            label="Email"
            isInvalid={Boolean(errors.email)}
            errorMessage={errors.email?.message}
            autoComplete="username"
            {...register("email")}
          />
          <PasswordInput
            label="Password"
            isInvalid={Boolean(errors.password)}
            errorMessage={errors.password?.message}
            autoComplete="current-password"
            {...register("password")}
          />
          <div className="flex items-center justify-between">
            <Checkbox size="sm">Remember me</Checkbox>
            <Link
              href="/auth/forgot-password"
              className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-500"
            >
              Forgot password?
            </Link>
          </div>
          <Button
            type="submit"
            isDisabled={!isValid}
            isLoading={isPending}
            className="w-full"
            color="primary"
          >
            Sign in
          </Button>
          <p className="text-sm font-light text-default-500">
            Don't have an account yet?{" "}
            <Link href="/auth/register" className="font-medium text-sm">
              Sign up
            </Link>
          </p>
        </form>
      </CardBody>
    </AuthLayout>
  );
};

export default LoginPage;
