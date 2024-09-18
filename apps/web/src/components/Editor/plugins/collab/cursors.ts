import { Annotation, RangeSet } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  type PluginValue,
  // @ts-ignore
  type Range,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import randomColor from "randomcolor";
import type Codelabs from "../../../../core";
import useStore from "../../../../utils/store";

const cursorsTheme = EditorView.baseTheme({
  ".cm-ySelection": {},
  ".cm-yLineSelection": {
    padding: 0,
    margin: "0px 2px 0px 4px",
  },
  ".cm-ySelectionCaret": {
    position: "relative",
    borderLeft: "1px solid black",
    borderRight: "1px solid black",
    marginLeft: "-1px",
    marginRight: "-1px",
    boxSizing: "border-box",
    display: "inline",
  },
  ".cm-ySelectionCaretDot": {
    borderRadius: "50%",
    position: "absolute",
    width: ".4em",
    height: ".4em",
    top: "-.2em",
    left: "-.2em",
    backgroundColor: "inherit",
    transition: "transform .3s ease-in-out",
    boxSizing: "border-box",
  },
  ".cm-ySelectionCaret:hover > .cm-ySelectionCaretDot": {
    transformOrigin: "bottom center",
    transform: "scale(0)",
  },
  ".cm-ySelectionInfo": {
    position: "absolute",
    top: "-1.05em",
    left: "-1px",
    fontSize: ".75em",
    fontFamily: "serif",
    fontStyle: "normal",
    fontWeight: "normal",
    lineHeight: "normal",
    userSelect: "none",
    color: "white",
    paddingLeft: "2px",
    paddingRight: "2px",
    zIndex: 101,
    transition: "opacity .3s ease-in-out",
    backgroundColor: "inherit",
    opacity: 0,
    transitionDelay: "0s",
    whiteSpace: "nowrap",
  },
  ".cm-ySelectionCaret:hover > .cm-ySelectionInfo": {
    opacity: 1,
    transitionDelay: "0s",
  },
});

const remoteSelectionsAnnotation = Annotation.define();

class RemoteCaretWidget extends WidgetType {
  color: string;
  name: string;

  constructor(color: string, name: string) {
    super();
    this.color = color;
    this.name = name;
  }

  toDOM() {
    const span = document.createElement("span");
    span.className = "cm-ySelectionCaret";
    span.style.backgroundColor = this.color;
    span.style.borderColor = this.color;

    const text1 = document.createTextNode("\u2060");
    span.appendChild(text1);

    const caretDot = document.createElement("div");
    caretDot.className = "cm-ySelectionCaretDot";
    span.appendChild(caretDot);

    const text2 = document.createTextNode("\u2060");
    span.appendChild(text2);

    const selectionInfo = document.createElement("div");
    selectionInfo.className = "cm-ySelectionInfo";

    const nameText = document.createTextNode(this.name);
    selectionInfo.appendChild(nameText);

    span.appendChild(selectionInfo);

    const text3 = document.createTextNode("\u2060");
    span.appendChild(text3);

    return span;
  }

  eq(widget: RemoteCaretWidget) {
    return widget.color === this.color;
  }

  compare(widget: RemoteCaretWidget) {
    return widget.color === this.color;
  }

  updateDOM() {
    return false;
  }

  get estimatedHeight() {
    return -1;
  }

  ignoreEvent() {
    return true;
  }
}

export default function collabCursorsPlugin(
  codelabs: Codelabs,
  currentTab: string,
) {
  const presence = codelabs.doc.getMap("presence");
  const user = useStore.getState().user;
  const userId = user?.id ?? "";
  const userName = `${user?.firstName} ${user?.lastName}`;

  class RemoteSelectionsPlugin implements PluginValue {
    private listener: number;
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.listener = presence.subscribe((event) => {
        if (event.by === "import") {
          for (const { diff } of event.events) {
            if (diff.type === "map") {
              const decorations: Range<Decoration> = [];

              for (const key of presence
                .keys()
                .filter((key) => key !== userId)) {
                const userPresence = presence.get(key) as {
                  name: string;
                  cursors: [number, number][];
                  activeTab: string;
                  color: string;
                };

                if (userPresence.activeTab === currentTab) {
                  for (const [from, to] of userPresence.cursors) {
                    const startLine = view.state.doc.lineAt(from);
                    const endLine = view.state.doc.lineAt(to);
                    if (startLine.number === endLine.number) {
                      decorations.push({
                        from,
                        to,
                        value: Decoration.mark({
                          attributes: {
                            style: `background-color: ${userPresence.color}`,
                          },
                          class: "cm-ySelection",
                        }),
                      });
                    } else {
                      decorations.push({
                        from,
                        to: startLine.from + startLine.length,
                        value: Decoration.mark({
                          attributes: {
                            style: `background-color: ${userPresence.color}`,
                          },
                          class: "cm-ySelection",
                        }),
                      });
                      decorations.push({
                        from: endLine.from,
                        to,
                        value: Decoration.mark({
                          attributes: {
                            style: `background-color: ${userPresence.color}`,
                          },
                          class: "cm-ySelection",
                        }),
                      });
                      for (
                        let i = startLine.number + 1;
                        i < endLine.number;
                        i++
                      ) {
                        const linePos = view.state.doc.line(i).from;
                        decorations.push({
                          from: linePos,
                          to: linePos,
                          value: Decoration.line({
                            attributes: {
                              style: `background-color: ${userPresence.color}`,
                              class: "cm-yLineSelection",
                            },
                          }),
                        });
                      }
                    }

                    decorations.push({
                      from: to,
                      to,
                      value: Decoration.widget({
                        side: 1,
                        block: false,
                        widget: new RemoteCaretWidget(
                          userPresence.color,
                          userPresence.name,
                        ),
                      }),
                    });
                  }
                }
                this.decorations = Decoration.set(decorations, true);
                view.dispatch({
                  annotations: [remoteSelectionsAnnotation.of([])],
                });
              }
            }
          }
        }
      });

      this.decorations = RangeSet.of([]);
    }

    destroy() {
      presence.unsubscribe(this.listener);
    }

    update(update: ViewUpdate) {
      presence.set(userId, {
        name: userName,
        cursors: update.state.selection.ranges.map((range) => [
          range.from,
          range.to,
        ]),
        activeTab: currentTab,
        color:
          (presence.get(userId) as { color: string } | undefined)?.color ??
          randomColor({ luminosity: "light" }),
      });
      codelabs.doc.commit();
    }
  }

  return [
    cursorsTheme,
    ViewPlugin.fromClass(RemoteSelectionsPlugin, {
      decorations: (v) => v.decorations,
    }),
  ];
}
