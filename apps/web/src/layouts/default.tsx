const DefaultLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <div className="flex flex-col justify-center items-center h-screen bg-slate-950 text-gray-200 p-2">
      {children}
    </div>
  );
};

export default DefaultLayout;
