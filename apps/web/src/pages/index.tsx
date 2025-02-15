import { valibotResolver } from "@hookform/resolvers/valibot";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
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
import { Link, useLocation } from "wouter";
import DefaultLayout from "../layouts/default";
import client from "../utils/httpClient";

const createCourseSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, "Required field")),
});
type CreateCourseFormValues = v.InferOutput<typeof createCourseSchema>;

const IndexPage = () => {
  const [, navigate] = useLocation();

  const { data } = useSuspenseQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data } = await client.api.courses.index.get();

      return data;
    },
  });

  const { mutate: createCourse, isPending } = useMutation({
    mutationFn: async ({ name }: CreateCourseFormValues) => {
      const { error, data } = await client.api.courses.index.post({
        name,
      });

      if (error) {
        throw new Error(error.value as string);
      }

      return data;
    },
    onSuccess: (id) => {
      navigate(`/courses/${id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<CreateCourseFormValues>({
    resolver: valibotResolver(createCourseSchema),
    mode: "onBlur",
  });

  const onSubmit = ({ name }: CreateCourseFormValues) => {
    createCourse({ name });
  };

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  return (
    <DefaultLayout>
      <h2 className="mb-4 text-3xl font-extrabold leading-none tracking-tight md:text-4xl">
        Courses
      </h2>
      {data?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.map((course) => (
            <Link key={course.id} to={`/courses/${course.id}`}>
              <Card className="hover:bg-default-100 h-30">
                <CardHeader>
                  <h5 className="text-2xl font-bold tracking-tight">
                    {course.name}
                  </h5>
                </CardHeader>
                <CardBody>
                  <p className="font-normal">{course.membersCount} membros</p>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-lg text-gray-900 dark:text-white">
          No courses found
        </p>
      )}
      <div className="flex justify-center m-5">
        <Button type="button" color="primary" onPress={onOpen}>
          Create course
        </Button>
      </div>
      <Modal isOpen={isOpen} onClose={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                <h1 className="text-2xl">Create course</h1>
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

export default IndexPage;
