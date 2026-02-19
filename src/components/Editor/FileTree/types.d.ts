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
  | {
      type: "binary"
      path: string
      hash: string
      size: number
      mimeType: string
    }
