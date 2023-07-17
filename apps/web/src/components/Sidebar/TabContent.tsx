import type { FunctionComponent } from "preact"

interface Props {
  id: string
  activeTab: string | null
}

const TabContent: FunctionComponent<Props> = ({ id, activeTab, children }) => {
  return id === activeTab ? <>{children}</> : <></>
}

export default TabContent
