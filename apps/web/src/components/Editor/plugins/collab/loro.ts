import { Annotation } from "@codemirror/state";
import {
  type EditorView,
  type PluginValue,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import { LoroText } from "loro-crdt";
import type Codelabs from "../../../../core";

export default function collabTextPlugin(
  codelabs: Codelabs,
  path: string,
  userId: string,
) {
  const loroText = codelabs.docTree
    .getNodeByID(path as `${number}@${number}`)
    .data.getOrCreateContainer("content", new LoroText());

  class LoroPluginClass implements PluginValue {
    private annotation = Annotation.define();
    private loroSubscription: number;

    constructor(view: EditorView) {
      this.loroSubscription = loroText.subscribe(({ by, events, origin }) => {
        if (origin === "runtime") {
          view.dispatch({
            changes: {
              from: 0,
              to: view.state.doc.length,
              insert: loroText.toString(),
            },
            annotations: [this.annotation.of(userId)],
          });
        } else if (by !== "local") {
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
              }
              view.dispatch({
                changes,
                annotations: [this.annotation.of(userId)],
              });
            }
          }
        }
      });
      setTimeout(() => {
        view.dispatch({
          changes: {
            from: 0,
            to: view.state.doc.length,
            insert: loroText.toString(),
          },
          annotations: [this.annotation.of(userId)],
        });
      }, 100);
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
        codelabs.doc.commit("editor");
      }
    }

    destroy() {
      loroText.unsubscribe(this.loroSubscription);
    }
  }

  return [ViewPlugin.fromClass(LoroPluginClass)];
}
