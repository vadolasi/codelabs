import { valibotResolver } from "@hookform/resolvers/valibot";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import * as v from "valibot";
import { Link, useLocation, useSearch } from "wouter";
import Button from "../../components/Button";
import Input from "../../components/Input";
import logo from "../../images/logo.svg";
import client from "../../utils/httpClient";
import useStore from "../../utils/store";

const schema = v.object({
  email: v.pipe(v.string(), v.minLength(1, "Required field")),
  password: v.pipe(v.string(), v.minLength(1, "Required field")),
});
type FormValues = v.InferOutput<typeof schema>;

// million-ignore
const LoginPage: React.FC = () => {
  const setUser = useStore((state) => state.setUser);
  const [, navigate] = useLocation();

  const paramsString = useSearch();
  const params = new URLSearchParams(paramsString);
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
    onSuccess: ({ email, firstName, lastName, id }) => {
      setUser({ email, firstName, lastName, id });
      navigate(redirect);
    },
    onError: (error) => {
      if (error.message === "Email not confirmed") {
        navigate("/auth/confirm-email", { state: { email } });
      }

      toast.error(error.message);
    },
  });

  return (
    <section className="bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
        <a
          href="https://codelabs.vitordaniel.com"
          className="flex items-center mb-6 text-2xl font-semibold text-gray-900 dark:text-white"
        >
          <img className="w-8 h-8 mr-2" src={logo} alt="logo" />
          Codelabs
        </a>
        <div className="w-full bg-white rounded-lg shadow dark:border md:mt-0 sm:max-w-md xl:p-0 dark:bg-gray-800 dark:border-gray-700">
          <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
            <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white">
              Sign in to your account
            </h1>
            <form
              className="space-y-4 md:space-y-6"
              onSubmit={handleSubmit(onSubmit)}
            >
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
              <div className="flex items-center justify-between">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="remember"
                      aria-describedby="remember"
                      type="checkbox"
                      className="w-4 h-4 border border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-primary-300 dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-primary-600 dark:ring-offset-gray-800"
                      required
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label
                      htmlFor="remember"
                      className="text-gray-500 dark:text-gray-300"
                    >
                      Remember me
                    </label>
                  </div>
                </div>
                <Link
                  to="/auth/forgot-password"
                  className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-500"
                >
                  Forgot password?
                </Link>
              </div>
              <Button
                type="submit"
                disabled={!isValid}
                loading={isPending}
                className="w-full"
              >
                Sign in
              </Button>
              <p className="text-sm font-light text-gray-500 dark:text-gray-400">
                Don’t have an account yet?{" "}
                <Link
                  to="/auth/register"
                  className="font-medium text-primary-600 hover:underline dark:text-primary-500"
                >
                  Sign up
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LoginPage;
