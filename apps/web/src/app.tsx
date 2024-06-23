import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense } from "react";
import { Toaster } from "react-hot-toast";
import { Navigate, useLocation, useRoutes } from "react-router-dom";

import routes from "~react-pages";
import LoadingIndicator from "./components/LoadingIndicator";
import useStore from "./utils/store";

const queryClient = new QueryClient();

export default function App() {
  const routing = useRoutes(routes);
  const user = useStore((state) => state.user);
  const { pathname } = useLocation();

  if (!user && !pathname.startsWith("/auth")) {
    return <Navigate to={`/auth/login?redirect=${pathname}`} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex flex-col justify-center items-center h-screen bg-slate-950 text-gray-200 p-2">
        <Toaster />
        <Suspense fallback={<LoadingIndicator />}>{routing}</Suspense>
      </div>
    </QueryClientProvider>
  );
}
