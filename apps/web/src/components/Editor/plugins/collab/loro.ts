import { Annotation } from "@codemirror/state";
import {
  type EditorView,
  type PluginValue,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import type { Loro, LoroText } from "loro-crdt";

export default function collabTextPlugin(
  loroDoc: Loro,
  loroText: LoroText,
  userId: string,
) {
  class LoroPluginClass implements PluginValue {
    private annotation = Annotation.define();

    constructor(view: EditorView) {
      loroText.subscribe(({ by, events }) => {
        if (by !== "local") {
          for (const event of events) {
            if (event.diff.type === "text") {
              const changes = [];
              let pos = 0;
              for (const diff of event.diff.diff) {
                if (diff.insert) {
                  changes.push({ from: pos, to: pos, insert: diff.insert });
                } else if (diff.delete) {
                  changes.push({
                    from: pos,
                    to: pos + diff.delete,
                    insert: "",
                  });
                  pos += diff.delete;
                } else if (diff.retain) {
                  pos += diff.retain;
                }
                view.dispatch({
                  changes,
                  annotations: [this.annotation.of(userId)],
                });
              }
            }
          }
        }
      });
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged &&
        !update.transactions.some(
          (tr) => tr.annotation(this.annotation) === userId,
        )
      ) {
        let adj = 0;
        update.changes.iterChanges((fromA, toA, _fromB, _toB, insert) => {
          const insertText = insert.sliceString(0, insert.length, "\n");
          if (fromA !== toA) {
            loroText.delete(fromA + adj, toA - fromA);
          }
          if (insertText.length > 0) {
            loroText.insert(fromA + adj, insertText);
          }
          adj += insertText.length - (toA - fromA);
        });
        loroDoc.commit();
      }
    }
  }

  return [ViewPlugin.fromClass(LoroPluginClass)];
}
