import { nord } from "@uiw/codemirror-theme-nord";
import CodeMirror, { type Extension } from "@uiw/react-codemirror";

const Editor: React.FC<{ extensions: Extension[] }> = ({ extensions }) => {
  return (
    <CodeMirror
      theme="dark"
      height="100%"
      className="h-full"
      extensions={[...extensions, nord]}
    />
  );
};

export default Editor;
