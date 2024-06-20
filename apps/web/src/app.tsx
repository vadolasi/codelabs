import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense } from "react";
import { Toaster } from "react-hot-toast";
import { useRoutes } from "react-router-dom";

import routes from "~react-pages";
import LoadingIndicator from "./components/LoadingIndicator";

const queryClient = new QueryClient();

export default function App() {
  const routing = useRoutes(routes);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex flex-col justify-center items-center h-screen bg-slate-950 text-gray-200 p-2">
        <Toaster />
        <Suspense fallback={<LoadingIndicator />}>{routing}</Suspense>
      </div>
    </QueryClientProvider>
  );
}
