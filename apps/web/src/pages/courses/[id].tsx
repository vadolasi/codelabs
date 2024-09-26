import { useSuspenseQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import client from "../../utils/httpClient";

const CoursePage = () => {
  const params = useParams();
  const id = params.id as string;

  const { data } = useSuspenseQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data } = await client.api.courses({ id }).get();

      return data;
    },
  });

  return (
    <div>
      <h1>{data?.name}</h1>
    </div>
  );
};

export default CoursePage;
