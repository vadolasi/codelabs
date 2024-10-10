import { Card } from "@nextui-org/react";
import logo from "../images/logo.svg";

const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto min-h-screen lg:py-0">
      <a
        href="https://codelabs.vitordaniel.com"
        className="flex items-center mb-6 text-2xl font-semibold text-gray-900 dark:text-white"
      >
        <img className="w-8 h-8 mr-2" src={logo} alt="logo" />
        Codelabs
      </a>
      <Card className="space-y-4 md:space-y-6 w-full md:w-1/2 lg:w-1/3 xl:w-1/4 p-4">
        {children}
      </Card>
    </div>
  );
};

export default AuthLayout;
