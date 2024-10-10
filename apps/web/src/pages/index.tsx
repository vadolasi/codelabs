import { valibotResolver } from "@hookform/resolvers/valibot";
import { Button, Input } from "@nextui-org/react";
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

  return (
    <DefaultLayout>
      <h2 className="mb-4 text-3xl font-extrabold leading-none tracking-tight text-gray-900 md:text-4xl dark:text-white">
        Courses
      </h2>
      {data?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.map((course) => (
            <Link
              key={course.id}
              to={`/courses/${course.id}`}
              className="block h-48 p-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700"
            >
              <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                {course.name}
              </h5>
              <p className="font-normal text-gray-700 dark:text-gray-400">
                {course.membersCount} membros
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-lg text-gray-900 dark:text-white">
          No courses found
        </p>
      )}
      <div className="flex justify-center m-5">
        <button
          id="defaultModalButton"
          data-modal-target="defaultModal"
          data-modal-toggle="defaultModal"
          className="block text-white bg-primary-700 hover:bg-primary-800 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800"
          type="button"
        >
          Create course
        </button>
      </div>
      <div
        id="defaultModal"
        tabIndex={-1}
        aria-hidden="true"
        className="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-modal md:h-full"
      >
        <div className="relative p-4 w-full max-w-2xl h-full md:h-auto">
          <div className="relative p-4 bg-white rounded-lg shadow dark:bg-gray-800 sm:p-5">
            <div className="flex justify-between items-center pb-4 mb-4 rounded-t border-b sm:mb-5 dark:border-gray-600">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Add course
              </h3>
              <button
                type="button"
                className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white"
                data-modal-toggle="defaultModal"
              >
                <svg
                  aria-hidden="true"
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="sr-only">Close modal</span>
              </button>
            </div>
            <form
              className="space-y-4 md:space-y-6"
              onSubmit={handleSubmit(onSubmit)}
            >
              <Input
                label="Name"
                isInvalid={Boolean(errors.name)}
                errorMessage={errors.name?.message}
                {...register("name")}
              />
              <Button
                type="submit"
                disabled={!isValid}
                isLoading={isPending}
                className="w-full"
              >
                Confirm
              </Button>
            </form>
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
};

export default IndexPage;
