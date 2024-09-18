import type Codelabs from "../../../../core";
import collabCursorsPlugin from "./cursors";
import collabTextPlugin from "./loro";

const collab = (codelabs: Codelabs, path: string, userId: string) => {
  return [
    collabTextPlugin(codelabs, path, userId),
    collabCursorsPlugin(codelabs, path),
  ];
};

export default collab;
