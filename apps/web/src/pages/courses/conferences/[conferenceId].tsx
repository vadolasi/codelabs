import { useSuspenseQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import client from "../../../utils/httpClient";
import NotFoundPage from "../../404";

const ConferencePage: React.FC = () => {
  const params = useParams();
  const courseId = params.courseId as string;
  const id = params.conferenceId as string;

  const { data } = useSuspenseQuery({
    queryKey: ["conference", courseId, id],
    queryFn: async () => {
      const { data } = await client.api.conferences({ courseId })({ id }).get();

      return data;
    },
  });

  if (!data) {
    return <NotFoundPage />;
  }

  return (
    <div>
      <h1>Conference</h1>
    </div>
  );
};

export default ConferencePage;
