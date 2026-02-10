type Item =
  | {
      type: "file"
      path: string
      content: string
    }
  | {
      type: "directory"
      path: string
    }
