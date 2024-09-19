import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Terminal } from "@xterm/xterm";
import { Loro, type LoroTree } from "loro-crdt";
import { EventEmitter } from "tseep";
import client from "../utils/httpClient";

type Events = {
  newFile: (args: {
    path: string;
    id: string;
    type: "file" | "folder";
    parent: { id: `${number}@${number}`; path: string };
    content?: string;
  }) => void;
  deleteFile: (args: {
    path: string;
    id: `${number}@${number}`;
    type: "file" | "folder";
    parent: { id: `${number}@${number}`; path: string };
  }) => void;
  renameFile: (args: {
    path: string;
    id: `${number}@${number}`;
    parent: { id: `${number}@${number}`; path: string };
    newName: string;
  }) => void;
  editFile: (args: {
    path: string;
    id: `${number}@${number}`;
    parent: { id: `${number}@${number}`; path: string };
    content: string;
  }) => void;
  iframeUrl: (url: string | null) => void;
  terminalElement: (element: HTMLDivElement | null) => void;
  loadingFinished: () => void;
  terminalResize: (cols: number, rows: number) => void;
};

export default class Codelabs {
  doc: Loro;
  docTree: LoroTree;
  terminal: Terminal;
  private terminalFitAddon: FitAddon;
  terminalElement: HTMLDivElement | null;
  private emmiter = new EventEmitter<Events>();
  iframeUrl: string | null;
  pathsMap = new Map<string, `${number}@${number}`>();
  private loadings = 0;

  constructor(id: string, userId: string, initialData: Uint8Array) {
    this.doc = new Loro();
    this.doc.setRecordTimestamp(true);
    this.docTree = this.doc.getTree("fileTree");
    this.terminalFitAddon = new FitAddon();
    this.terminal = new Terminal({
      cursorBlink: true,
      convertEol: true,
      fontSize: 16,
      fontFamily: "Menlo, courier-new, courier, monospace",
    });
    this.terminalElement = null;
    this.iframeUrl = null;

    this.setupLoro(id, userId, initialData);
    this.setupTerminal();
  }

  on<T extends keyof Events>(event: T, listener: Events[T]) {
    this.emmiter.on(event, listener);
  }

  off<T extends keyof Events>(event: T, listener: Events[T]) {
    this.emmiter.off(event, listener);
  }

  once<T extends keyof Events>(event: T, listener: Events[T]) {
    this.emmiter.once(event, listener);
  }

  private setupLoro(id: string, userId: string, initialData: Uint8Array) {
    const workspace = client.api.workspaces({ id })({ userId }).subscribe();
    workspace.ws.binaryType = "arraybuffer";
    this.doc.import(initialData);

    let lastVersion = this.doc.version();

    this.doc.subscribe(({ by, events }) => {
      if (by === "local") {
        workspace.ws.send(this.doc.exportFrom(lastVersion));
        lastVersion = this.doc.version();
      }

      for (const { diff: event } of events) {
        if (event.type === "tree") {
          for (const diff of event.diff) {
            switch (diff.action) {
              case "create":
                this.pathsMap.set(this.getFullPath(diff.target), diff.target);
                break;
              case "delete":
                this.pathsMap.delete(this.getFullPath(diff.target));
                break;
            }
          }
        }
      }
    });
  }

  private setupTerminal() {
    this.terminal.loadAddon(new WebLinksAddon());
    this.terminal.loadAddon(this.terminalFitAddon);
  }

  setTerminalElement(element: HTMLDivElement | null) {
    this.terminalElement = element;

    if (element) {
      this.terminal.open(element);
      this.terminalFitAddon.fit();

      const resizeObserver = new ResizeObserver(() => {
        this.terminalFitAddon.fit();
        this.emmiter.emit(
          "terminalResize",
          this.terminal.cols,
          this.terminal.rows,
        );
      });

      resizeObserver.observe(element);
    }
  }

  setIframeUrl(url: string | null) {
    this.iframeUrl = url;

    this.emmiter.emit("iframeUrl", url);
  }

  getFullPath(nodeId: `${number}@${number}`) {
    const node = this.docTree.getNodeByID(nodeId);
    const path = [node.data.get("name")];
    let parent = node.parent();

    while (parent && parent.data.get("name") !== "/") {
      path.unshift(parent.data.get("name"));
      parent = parent.parent();
    }

    return path.join("/");
  }

  registerPlugin(
    plugin: (codelabs: Codelabs, finishLoading: () => void) => void,
  ) {
    this.loadings++;

    plugin(this, () => {
      this.loadings--;

      if (this.loadings === 0) {
        this.emmiter.emit("loadingFinished");
      }
    });
  }
}
