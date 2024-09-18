import { valibotResolver } from "@hookform/resolvers/valibot";
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import * as v from "valibot";
import type useShowHide from "../../utils/useShowHide";
import Button from "../Button";
import Input from "../Input";

const fileNameSchema = v.object({
  name: v.pipe(
    v.string(),
    v.minLength(1, "File name must not be empty"),
    v.maxLength(255, "File name must not exceed 255 characters"),
    v.regex(/^[^/\\]+$/, "File name must not contain / or \\"),
    v.transform((value) => value.trim()),
  ),
});
type FileName = v.InferOutput<typeof fileNameSchema>;

// million-ignore
const NewFileDialog: React.FC<{
  handler: ReturnType<typeof useShowHide>;
  onFileCreate: (name: string) => unknown;
}> = ({ handler, onFileCreate }) => {
  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors, isValid },
    reset,
  } = useForm<FileName>({
    resolver: valibotResolver(fileNameSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    if (handler.visible) {
      setFocus("name");
    } else {
      reset();
    }
  }, [handler.visible]);

  const onSubmit = (data: FileName) => {
    onFileCreate(data.name);
    handler.hide();
  };

  return (
    <Dialog.Root open={handler.visible} onOpenChange={handler.toggle}>
      <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-50" />
      <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-md border shadow-md dark:bg-gray-700 dark:border-gray-700 w-full max-w-lg max-h-full">
        <div className="flex items-center justify-between p-4 md:p-5 border-b dark:border-gray-600">
          <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-white">
            New File
          </Dialog.Title>
        </div>
        <div className="p-4 md:p-5 space-y-4">
          <form className="mt-4" onSubmit={handleSubmit(onSubmit)}>
            <Input
              type="text"
              label="Name"
              error={errors.name?.message}
              {...register("name")}
            />
          </form>
        </div>
        <div className="flex items-center p-4 md:p-5 border-t border-gray-200 rounded-b dark:border-gray-600">
          <Button
            className="px-4 py-2 ml-2 text-sm text-white bg-blue-500 rounded-md"
            type="submit"
            disabled={!isValid}
          >
            Create
          </Button>
          <Button
            className="px-4 py-2 text-sm text-white bg-blue-500 rounded-md"
            onClick={handler.hide}
            type="button"
            color="secondary"
          >
            Cancel
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default NewFileDialog;
