import { valibotResolver } from "@hookform/resolvers/valibot";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import * as v from "valibot";
import Button from "../../components/Button";
import logo from "../../images/logo.svg";
import client from "../../utils/httpClient";

const schema = v.object({
  code: v.pipe(
    v.array(v.pipe(v.number(), v.minValue(0), v.maxValue(9))),
    v.length(8),
  ),
});
type FormValues = v.InferOutput<typeof schema>;

// million-ignore
const ConfirmEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useLocation();

  const {
    register,
    handleSubmit,
    setFocus,
    formState: { isValid },
  } = useForm<FormValues>({
    resolver: valibotResolver(schema),
    mode: "onBlur",
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (code: string) =>
      client.api.auth["confirm-email"].post({ code }),
    onError: () => {
      toast.error("Failed to confirm email");
    },
    onSuccess: () => {
      toast.success("Email confirmed");
      navigate("/auth/login");
    },
  });

  const { mutate: resendEmail, isPending: resendPending } = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await client.api.auth["resent-email-confirmation"].post(
        { email },
      );

      if (error) {
        throw new Error(error.value as string);
      }
    },
    onSuccess: () => {
      toast.success("Email sent");
    },
  });

  const isLoading = isPending || resendPending;

  const onSubmit = ({ code }: FormValues) => {
    const pin = code.join("");
    mutate(pin);
  };

  useEffect(() => {
    setFocus("code.0");
  }, []);

  useEffect(() => {
    if (isValid) {
      handleSubmit(onSubmit)();
    }
  }, [isValid]);

  if (!state?.email) {
    toast.error("Invalid email");
    return <Navigate to="/auth/login" />;
  }

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
              Confirm your email
            </h1>
            <form
              className="space-y-4 md:space-y-6"
              onSubmit={handleSubmit(onSubmit)}
            >
              <div className="flex mb-2 rtl:space-x-reverse justify-between">
                {Array.from({ length: 8 }).map((_, index) => (
                  <>
                    {/* biome-ignore lint/suspicious/noArrayIndexKey: dont need */}
                    <div key={`digit-${index}`}>
                      <label htmlFor="code-1" className="sr-only">
                        {index + 1}º digit
                      </label>
                      <input
                        type="text"
                        pattern="\d*"
                        maxLength={1}
                        inputMode="numeric"
                        min={0}
                        max={9}
                        step={1}
                        className="block w-9 h-9 py-3 text-sm font-extrabold text-center text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
                        required
                        {...register(`code.${index}`, {
                          valueAsNumber: true,
                          onChange: (event) => {
                            if (index < 7 && event.target.value) {
                              setFocus(`code.${index + 1}`);
                            }
                          },
                        })}
                      />
                    </div>
                  </>
                ))}
              </div>
              <p
                id="helper-text-explanation"
                className="mt-2 text-sm text-gray-500 dark:text-gray-400"
              >
                Please introduce the 8 digit code we sent via email.
              </p>
              <Button
                type="button"
                className="w-full"
                loading={isLoading}
                onClick={() => resendEmail(state.email)}
              >
                Resend email
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ConfirmEmailPage;
