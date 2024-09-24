import { valibotResolver } from "@hookform/resolvers/valibot";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import * as v from "valibot";
import Button from "../../components/Button";
import Input from "../../components/Input";
import logo from "../../images/logo.svg";
import client from "../../utils/httpClient";

const schema = v.pipe(
  v.object({
    email: v.pipe(
      v.string(),
      v.minLength(1, "Required field"),
      v.email("Invalid email address"),
    ),
    firstName: v.pipe(
      v.string(),
      v.minLength(1, "Required field"),
      v.maxLength(20, "Maximum of 20 characters"),
      v.regex(/^[a-zA-Z]+$/, "Only letters are allowed"),
    ),
    lastName: v.pipe(
      v.string(),
      v.minLength(1, "Required field"),
      v.maxLength(20, "Maximum of 20 characters"),
      v.regex(/^[a-zA-Z]+$/, "Only letters are allowed"),
    ),
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

// million-ignore
const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const { mutate, isPending } = useMutation({
    mutationFn: async ({
      email,
      firstName,
      lastName,
      password,
    }: Omit<FormValues, "passwordConfirmation">) => {
      const { error } = await client.api.users.register.post({
        email,
        firstName,
        lastName,
        password,
      });

      if (error) {
        throw new Error(error.value as string);
      }

      return { email };
    },
    onSuccess: ({ email }) => {
      navigate("/auth/confirm-email", { state: { email } });
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    resolver: valibotResolver(schema),
    mode: "onBlur",
  });

  const onSubmit = ({ email, firstName, lastName, password }: FormValues) => {
    mutate({ email, firstName, lastName, password });
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
        <div className="w-full bg-white rounded-lg shadow dark:border md:mt-0 sm:max-w-md xl:p-0 dark:bg-gray-800 dark:border-gray-700">
          <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
            <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white">
              Create an account
            </h1>
            <form
              className="space-y-4 md:space-y-6"
              onSubmit={handleSubmit(onSubmit)}
            >
              <Input
                label="Your email"
                error={errors.email?.message}
                {...register("email")}
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-4 -mb-1">
                <Input
                  label="First name"
                  error={errors.firstName?.message}
                  {...register("firstName")}
                />
                <Input
                  label="Last name"
                  error={errors.lastName?.message}
                  {...register("lastName")}
                />
              </div>
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
                    <a
                      className="font-medium text-primary-600 hover:underline dark:text-primary-500"
                      href="https://codelabs.vitordaniel.com/terms-and-conditions"
                    >
                      Terms and Conditions
                    </a>
                  </label>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={!isValid}
                loading={isPending}
              >
                Create an account
              </Button>
              <p className="text-sm font-light text-gray-500 dark:text-gray-400">
                Already have an account?{" "}
                <Link
                  to="/auth/login"
                  className="font-medium text-primary-600 hover:underline dark:text-primary-500"
                >
                  Login here
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RegisterPage;
