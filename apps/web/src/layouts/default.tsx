import { Navigate } from "react-router"
import useStore from "../store"
import { useEffect } from "react"
import client from "../httpClient"

const DefaultLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useStore(state => state.user)

  useEffect(() => {
    const lastRefresh = localStorage.getItem("lastRefresh")
    if (!lastRefresh || Date.now() - Number.parseInt(lastRefresh) >= 1000 * 60 * 59) {
      client.api.auth["refresh-token"].post()
      localStorage.setItem("lastRefresh", Date.now().toString())
    }

    setInterval(() => {
      client.api.auth["refresh-token"].post()
    }, 1000 * 60 * 59)
  }, [])

  if (!user) {
    return <Navigate to="/auth/login" />
  }

  return children
}

export default DefaultLayout
