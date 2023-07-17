import type { FunctionComponent } from "preact"
import type { JSX } from "preact/jsx-runtime"
import Button from "./Button"

interface Props {
  id: string
  activeTab: string | null
  setActiveTab: (id: string | null) => void
  icon: JSX.Element
}

const TabItem: FunctionComponent<Props> = ({ id, icon, activeTab, setActiveTab }) => {
  return <Button onClick={() => id === activeTab ? setActiveTab(null) : setActiveTab(id)}>{icon}</Button>
}

export default TabItem
