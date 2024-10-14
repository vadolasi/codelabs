import { Spacer, User } from "@nextui-org/react";
import { Suspense } from "react";
import logo from "../images/logo.svg";
import useStore from "../utils/store";

const DefaultLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const user = useStore((state) => state.user)!;

  return (
    <div className="antialiased min-h-screen">
      <aside
        className="fixed top-0 left-0 z-40 flex h-full w-72 flex-col !border-r-small border-divider p-6 transition-width"
        aria-label="Sidenav"
        id="drawer-navigation"
      >
        <div className="flex items-center gap-3 px-3">
          <img src={logo} alt="logo" className="h-8 w-8" />
          <span className="text-small font-bold uppercase opacity-100">
            Codelabs
          </span>
        </div>
        <Spacer y={8} />
        <div className="flex items-center gap-3 px-3">
          <User
            name={`${user.firstName} ${user.lastName}`}
            avatarProps={{
              src: user.picture,
              className:
                "box-border ring-2 ring-offset-2 ring-offset-background dark:ring-offset-background-dark ring-default overflow-hidden",
            }}
            description={user.email}
          />
        </div>
      </aside>
      <main className="p-4 md:ml-72 h-auto">
        <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
      </main>
    </div>
  );
};

export default DefaultLayout;
