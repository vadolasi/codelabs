import { Navigate, useLocation } from "react-router";
import useStore from "../utils/store";

const DefaultLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const user = useStore((state) => state.user);

  const { pathname } = useLocation();

  if (!user) {
    return <Navigate to={`/auth/login?redirect=${pathname}`} />;
  }

  return children;
};

export default DefaultLayout;
