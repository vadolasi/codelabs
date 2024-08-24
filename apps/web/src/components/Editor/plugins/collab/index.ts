import { type Loro, LoroText } from "loro-crdt";
import collabCursorsPlugin from "./cursors";
import collabTextPlugin from "./loro";

const collab = (doc: Loro, path: string, userId: string) => {
  const docText = doc
    .getTree("fileTree")
    .getNodeByID(path as `${number}@${number}`)
    .data.getOrCreateContainer("content", new LoroText());

  return [
    collabTextPlugin(doc, docText, userId),
    collabCursorsPlugin(doc, path),
  ];
};

export default collab;
