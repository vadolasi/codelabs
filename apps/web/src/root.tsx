import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { keyframes } from "goober";
import { Suspense, useEffect } from "react";
import { Toaster, resolveValue } from "react-hot-toast";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import LoadingIndicator from "./components/LoadingIndicator";
import DefaultLayout from "./layouts/default";
import cn from "./utils/cn";
import useStore from "./utils/store";

const queryClient = new QueryClient();

const enterAnimation = `
0% {transform: translate3d(0,-200%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`;

const exitAnimation = `
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,-150%,-1px) scale(.6); opacity:0;}
`;

const fadeInAnimation = "0%{opacity:0;} 100%{opacity:1;}";
const fadeOutAnimation = "0%{opacity:1;} 100%{opacity:0;}";

export const prefersReducedMotion = (() => {
  // Cache result
  let shouldReduceMotion: boolean | undefined = undefined;

  return () => {
    if (shouldReduceMotion === undefined && typeof window !== "undefined") {
      const mediaQuery = matchMedia("(prefers-reduced-motion: reduce)");
      shouldReduceMotion = !mediaQuery || mediaQuery.matches;
    }
    return shouldReduceMotion;
  };
})();

const getAnimationStyle = (visible: boolean): React.CSSProperties => {
  const [enter, exit] = prefersReducedMotion()
    ? [fadeInAnimation, fadeOutAnimation]
    : [enterAnimation, exitAnimation];

  return {
    animation: visible
      ? `${keyframes(enter)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`
      : `${keyframes(exit)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`,
  };
};

export default function App() {
  const { user, theme } = useStore();
  const { pathname } = useLocation();

  useEffect(() => {
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;

    if ((theme === "auto" && prefersDark) || theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  if (!user && !pathname.startsWith("/auth")) {
    return <Navigate to={`/auth/login?redirect=${pathname}`} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster>
        {(t) => (
          <div
            className={cn(
              "flex items-center p-4 mb-4 text-sm text-blue-800 border border-blue-300 rounded-lg bg-blue-50 dark:bg-gray-800 dark:text-blue-400 dark:border-blue-800",
              !t.visible && "opacity-0 pointer-events-none",
              t.type === "error" &&
                "text-red-800 border-red-300 bg-red-50 dark:bg-red-800 dark:text-red-400 dark:border-red-800",
              t.type === "success" &&
                "text-green-800 border-green-300 bg-green-50 dark:bg-green-800 dark:text-green-400 dark:border-green-800",
              t.type === "loading" &&
                "text-gray-800 border-gray-300 bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600",
            )}
            style={getAnimationStyle(t.visible)}
            role="alert"
          >
            {t.type === "loading" ? (
              <svg
                aria-hidden="true"
                className="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
                viewBox="0 0 100 101"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                  fill="currentColor"
                />
                <path
                  d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                  fill="currentFill"
                />
              </svg>
            ) : (
              <svg
                className="flex-shrink-0 inline w-4 h-4 me-3"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z" />
              </svg>
            )}
            <span className="sr-only">{t.type}</span>
            <div>{resolveValue(t.message, t)}</div>
          </div>
        )}
      </Toaster>
      <Suspense
        fallback={
          <DefaultLayout>
            <LoadingIndicator />
          </DefaultLayout>
        }
      >
        <Outlet />
      </Suspense>
    </QueryClientProvider>
  );
}
