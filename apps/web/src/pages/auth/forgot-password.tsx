import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";
import { z } from "zod";
import Button from "../../components/Button";
import Input from "../../components/Input";
import client from "../../utils/httpClient";

const schema = z.object({
  email: z.string().min(1, "Required field"),
});
type FormValues = z.infer<typeof schema>;

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
    resolver: zodResolver(schema),
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
    <form
      className="p-8 rounded-lg shadow-md w-full md:w-1/2 lg:w-1/3 xl:w-1/4 bg-slate-800"
      onSubmit={handleSubmit(onSubmit)}
    >
      <h1 className="text-2xl font-semibold mb-4">Login</h1>
      <Input
        label="Email or Username"
        error={errors.email?.message}
        {...register("email")}
      />
      <Button type="submit">Send email</Button>
      <p className="mt-4 text-center">
        <Link to="/auth/login" className="text-cyan-500">
          Back to login
        </Link>
      </p>
    </form>
  );
};

export default ForgotPasswordPage;
