import { Navigate } from "react-router"
import useStore from "../store"

const DefaultLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useStore(state => state.user)

  if (!user) {
    return <Navigate to="/auth/login" />
  }

  return children
}

export default DefaultLayout
