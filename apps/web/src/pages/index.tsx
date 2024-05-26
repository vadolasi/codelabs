import React from "react"
import Editor from "@monaco-editor/react"

const IndexPage: React.FC = () => {
  return (
    <div className="flex h-screen">
      <div className="w-96">
        <p>oi</p>
      </div>
      <div className="w-full">
        <Editor
          height="100%"
          defaultLanguage="typescript"
          defaultValue="// Write your code here"
          loading="Carregando..."
        />
      </div>
    </div>
  )
}

export default IndexPage
