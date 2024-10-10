import { Input } from "@nextui-org/react";
import { EyeClosedIcon, EyeOpenIcon } from "@radix-ui/react-icons";
import { forwardRef, useState } from "react";

type PasswordInputProps = React.ComponentProps<typeof Input>;

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (props, ref) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isTyping, setIsTyping] = useState(false);

    return (
      <Input
        ref={ref}
        {...props}
        onChange={(e) => {
          props.onChange?.(e);
          if (e.currentTarget.value === "") {
            setIsTyping(false);
          } else {
            setIsTyping(true);
          }
        }}
        type={isVisible ? "text" : "password"}
        endContent={
          isTyping && (
            <button
              className="focus:outline-none"
              type="button"
              onClick={() => setIsVisible((isVisible) => !isVisible)}
              aria-label="toggle password visibility"
            >
              {isVisible ? (
                <EyeClosedIcon className="w-5 h-5 text-default-400 pointer-events-none" />
              ) : (
                <EyeOpenIcon className="w-5 h-5 text-default-400 pointer-events-none" />
              )}
            </button>
          )
        }
      />
    );
  },
);

export default PasswordInput;
