import Editor, { useMonaco } from "@monaco-editor/react";
import { Mutex } from "async-mutex";
import { Loro } from "loro-crdt";
import { useEffect } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useParams } from "react-router";
import DefaultLayout from "../../layouts/default";
import client from "../../utils/httpClient";
import useStore from "../../utils/store";

const WorkspacePage: React.FC = () => {
  const monaco = useMonaco();
  const params = useParams();
  const user = useStore((store) => store.user);

  const id = params.id as string;

  useEffect(() => {
    if (monaco && user) {
      const workspace = client.api.workspaces.ws({ id }).subscribe();
      workspace.ws.binaryType = "arraybuffer";

      const doc = new Loro();
      let lastVersion = doc.version();

      const editor = monaco.editor.getModels()[0];

      workspace.ws.onmessage = (ev) => {
        doc.import(new Uint8Array(ev.data));
      };

      const docText = doc.getText("/");

      let fromRemote = false;

      const mutex = new Mutex();

      docText.subscribe(({ events, by }) => {
        mutex.runExclusive(async () => {
          if (by === "import") {
            fromRemote = true;
            for (const event of events) {
              if (event.diff.type === "text") {
                let index = 0;

                for (const change of event.diff.diff) {
                  if (change.retain) {
                    index += change.retain;
                  } else if (change.insert) {
                    const pos = editor.getPositionAt(index);
                    const range = new monaco.Selection(
                      pos.lineNumber,
                      pos.column,
                      pos.lineNumber,
                      pos.column,
                    );
                    editor.applyEdits([{ range, text: change.insert }]);
                    index += change.insert.length;
                  } else if (change.delete) {
                    const pos = editor.getPositionAt(index);
                    const endPos = editor.getPositionAt(index + change.delete);
                    const range = new monaco.Selection(
                      pos.lineNumber,
                      pos.column,
                      endPos.lineNumber,
                      endPos.column,
                    );
                    editor.applyEdits([{ range, text: "" }]);
                  }
                }
              }
            }
            fromRemote = false;
          }
        });
      });

      editor.onDidChangeContent((ev) => {
        if (!fromRemote) {
          mutex.runExclusive(async () => {
            for (const change of ev.changes.sort(
              (change1, change2) => change2.rangeOffset - change1.rangeOffset,
            )) {
              docText.delete(change.rangeOffset, change.rangeLength);
              docText.insert(change.rangeOffset, change.text);
            }
            doc.commit();
            workspace.ws.send(doc.exportFrom(lastVersion));
            lastVersion = doc.version();
          });
        }
      });
    }
  }, [user, id, monaco]);

  return (
    <DefaultLayout>
      <div className="p-2w">OI</div>
      <PanelGroup autoSaveId="example" direction="horizontal">
        <Panel
          id="sidebar"
          minSize={5}
          defaultSize={10}
          maxSize={20}
          order={1}
          collapsible
        >
          <div>oi</div>
        </Panel>
        <PanelResizeHandle
          hitAreaMargins={{ coarse: 0, fine: 0 }}
          className="bg-slate-950 w-2 flex items-center justify-center group p-0"
        >
          <div className="w-0.5 rounded h-5 bg-slate-800 group-hover:bg-cyan-7000" />
        </PanelResizeHandle>
        <Panel order={2} id="main">
          <div className="rounded h-full overflow-hidden">
            <Editor
              height="100%"
              defaultLanguage="typescript"
              defaultValue=""
              loading="Carregando..."
              theme="vs-dark"
            />
          </div>
        </Panel>
      </PanelGroup>
    </DefaultLayout>
  );
};

export default WorkspacePage;
