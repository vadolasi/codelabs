import cn from "../utils/cn";

type Props = React.HTMLProps<HTMLDivElement>;

const DefaultLayout: React.FC<Props> = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        "flex flex-col justify-center items-center h-screen bg-slate-950 text-gray-200 p-2",
        className,
      )}
      {...props}
    />
  );
};

export default DefaultLayout;
