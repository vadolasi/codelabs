import { useState } from "react";

const useShowHide = (defaultVisible = false) => {
  const [visible, setVisible] = useState(defaultVisible);

  const show = () => setVisible(true);
  const hide = () => setVisible(false);

  const toggle = (nextVisible?: boolean) => {
    if (typeof nextVisible !== "undefined") {
      setVisible(nextVisible);
    } else {
      setVisible((previousVisible) => !previousVisible);
    }
  };

  return { hide, show, toggle, visible };
};

export default useShowHide;
