import { nord } from "@uiw/codemirror-theme-nord";
import CodeMirror, { type Extension } from "@uiw/react-codemirror";

const Editor: React.FC<{ extensions: Extension[]; initialValue: string }> = ({
  extensions,
  initialValue,
}) => {
  return (
    <CodeMirror
      theme="dark"
      height="100%"
      className="h-full"
      value={initialValue}
      extensions={[...extensions, nord]}
    />
  );
};

export default Editor;
