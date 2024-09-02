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
const NewFolderDialog: React.FC<{
  handler: ReturnType<typeof useShowHide>;
  onFileCreate: (name: string) => unknown;
}> = ({ handler, onFileCreate }) => {
  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors, isValid },
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
    }
  }, [handler.visible]);

  const onSubmit = (data: FileName) => {
    onFileCreate(data.name);
    handler.hide();
  };

  return (
    <Dialog.Root open={handler.visible} onOpenChange={handler.toggle}>
      <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-50" />
      <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded-md shadow-md w-96 dark:bg-gray-700">
        <Dialog.Title className="text-lg font-bold">New File</Dialog.Title>
        <Dialog.Description className="text-sm text-gray-500">
          Enter the name of the new file
        </Dialog.Description>
        <form className="mt-4" onSubmit={handleSubmit(onSubmit)}>
          <Input type="text" label="Name" {...register("name")} />
          {errors.name && (
            <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
          )}
          <div className="flex justify-end mt-4">
            <Button
              className="px-4 py-2 text-sm text-white bg-blue-500 rounded-md"
              onClick={handler.hide}
              type="button"
            >
              Cancel
            </Button>
            <Button
              className="px-4 py-2 ml-2 text-sm text-white bg-blue-500 rounded-md"
              type="submit"
              disabled={!isValid}
            >
              Create
            </Button>
          </div>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default NewFolderDialog;
