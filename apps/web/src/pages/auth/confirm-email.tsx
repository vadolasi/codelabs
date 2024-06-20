import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import Button from "../../components/Button";
import client from "../../utils/httpClient";

const schema = z.object({
  code: z.number(),
});
type FormValues = z.infer<typeof schema>;

const ConfirmEmailPage: React.FC = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
  });

  const { mutateAsync } = useMutation({
    mutationFn: (code: number) =>
      client.api.auth["confirm-email"].post({ code: code.toString() }),
    onError: () => {
      toast.error("Failed to confirm email");
    },
    onSuccess: () => {
      toast.success("Email confirmed");
      navigate("/auth/login");
    },
  });

  const { mutateAsync: resendEmail } = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await client.api.auth["resent-email-confirmation"].post(
        { email },
      );

      if (error) {
        throw new Error(error.value as string);
      }
    },
  });

  const onSubmit = ({ code }: FormValues) => {
    mutateAsync(code);
  };

  if (!state?.email) {
    toast.error("Invalid email");
    return <Navigate to="/auth/login" />;
  }

  return (
    <form
      className="p-8 rounded-lg shadow-md w-full md:w-1/2 lg:w-1/3 xl:w-1/4 bg-slate-800"
      onSubmit={handleSubmit(onSubmit)}
    >
      <h2 className="text-xl font-semibold mb-3">
        Type the code sent to your email
      </h2>
      <input
        type="number"
        className="w-full p-2 rounded-md border border-gray-300 text-slate-100 text-2xl"
        {...register("code", { valueAsNumber: true })}
      />
      {errors.code && <p className="text-red-500">{errors.code.message}</p>}
      <Button type="submit" className="mt-4">
        Confirm
      </Button>
      <button
        type="button"
        className="mt-4 text-center text-cyan-500 w-full"
        onClick={() =>
          toast.promise(resendEmail(state.email), {
            loading: "Resending email...",
            success: "Email confirmation resent",
            error: "Error resending email",
          })
        }
      >
        Resend email
      </button>
    </form>
  );
};

export default ConfirmEmailPage;
