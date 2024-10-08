import { valibotResolver } from "@hookform/resolvers/valibot";
import { Button, Input, Link } from "@nextui-org/react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import * as v from "valibot";
import logo from "../../images/logo.svg";
import client from "../../utils/httpClient";

const schema = v.object({
  email: v.pipe(v.string(), v.minLength(1, "Required field")),
});
type FormValues = v.InferOutput<typeof schema>;

const ForgotPasswordPage: React.FC = () => {
  const { mutateAsync: sendEmail } = useMutation({
    mutationFn: async ({ email }: FormValues) => {
      const { error, data } = await client.api.auth["reset-password"].post({
        email,
      });

      if (error) {
        throw new Error(error.value as string);
      }

      return data;
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

  const onSubmit = ({ email }: FormValues) => {
    toast.promise(sendEmail({ email }), {
      loading: "Sending email...",
      success: "Email sent",
      error: (error) => error.message,
    });
  };

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
        <div className="w-full p-6 bg-white rounded-lg shadow dark:border md:mt-0 sm:max-w-md dark:bg-gray-800 dark:border-gray-700 sm:p-8">
          <h1 className="mb-1 text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white">
            Forgot your password?
          </h1>
          <p className="font-light text-gray-500 dark:text-gray-400">
            Don't fret! Just type in your email and we will send you a code to
            reset your password!
          </p>
          <form
            className="mt-4 space-y-4 lg:mt-5 md:space-y-5"
            onSubmit={handleSubmit(onSubmit)}
          >
            <Input
              label="Email or Username"
              isInvalid={Boolean(errors.email)}
              errorMessage={errors.email?.message}
              autoComplete="username"
              {...register("email")}
            />
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="terms"
                  aria-describedby="terms"
                  type="checkbox"
                  className="w-4 h-4 border border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-primary-300 dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-primary-600 dark:ring-offset-gray-800"
                  required
                />
              </div>
              <div className="ml-3 text-sm">
                <label
                  htmlFor="terms"
                  className="font-light text-gray-500 dark:text-gray-300"
                >
                  I accept the{" "}
                  <Link
                    href="https://codelabs.vitordaniel.com/terms-and-conditions"
                    isExternal={true}
                  >
                    Terms and Conditions
                  </Link>
                </label>
              </div>
            </div>
            <Button type="submit" className="w-full" color="primary">
              Reset password
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ForgotPasswordPage;
