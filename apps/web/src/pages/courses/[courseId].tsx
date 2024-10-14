import { valibotResolver } from "@hookform/resolvers/valibot";
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
} from "@nextui-org/react";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import * as v from "valibot";
import { useLocation, useParams } from "wouter";
import DefaultLayout from "../../layouts/default";
import client from "../../utils/httpClient";
import NotFoundPage from "../404";

const createConferenceSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, "Required field")),
});
type CreateConferenceFormValues = v.InferOutput<typeof createConferenceSchema>;

const CoursePage = () => {
  const params = useParams();
  const [, navigate] = useLocation();
  const courseId = params.courseId as string;

  const { data } = useSuspenseQuery({
    queryKey: ["courses", courseId],
    queryFn: async () => {
      const { data } = await client.api.courses({ id: courseId }).get();

      return data;
    },
  });

  const { mutate: createCourse, isPending } = useMutation({
    mutationFn: async ({ name }: CreateConferenceFormValues) => {
      const { error, data } = await client.api.conferences.index.post({
        name,
        courseId,
      });

      if (error) {
        throw new Error(error.value as string);
      }

      return data;
    },
    onSuccess: (conferenceId) => {
      navigate(`~/courses/${courseId}/conferences/${conferenceId}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<CreateConferenceFormValues>({
    resolver: valibotResolver(createConferenceSchema),
    mode: "onBlur",
  });

  const onSubmit = ({ name }: CreateConferenceFormValues) => {
    createCourse({ name });
  };

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  if (!data || !data.course) {
    return <NotFoundPage />;
  }

  return (
    <DefaultLayout>
      <h1>{data.course.name}</h1>
      {data.role === "owner" && (
        <Button color="primary" onPress={onOpen}>
          Create conference
        </Button>
      )}
      <Modal isOpen={isOpen} onClose={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                <h1 className="text-2xl">Create conference</h1>
              </ModalHeader>
              <form onSubmit={handleSubmit(onSubmit)}>
                <ModalBody>
                  <Input
                    label="Name"
                    isInvalid={Boolean(errors.name)}
                    errorMessage={errors.name?.message}
                    {...register("name")}
                  />
                </ModalBody>
                <ModalFooter>
                  <Button
                    type="submit"
                    color="primary"
                    disabled={!isValid}
                    isLoading={isPending}
                  >
                    Confirm
                  </Button>
                  <Button color="danger" variant="light" onPress={onClose}>
                    Cancel
                  </Button>
                </ModalFooter>
              </form>
            </>
          )}
        </ModalContent>
      </Modal>
    </DefaultLayout>
  );
};

export default CoursePage;
