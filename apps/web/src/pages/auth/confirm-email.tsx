import { useMutation } from "@tanstack/react-query"
import { Navigate, useSearchParams } from "react-router-dom"
import client from "../../httpClient"
import { useEffect } from "react"
import toast from "react-hot-toast"
import LoadingIndicator from "../../components/LoadingIndicator"

const ConfirmEmailPage: React.FC = () => {
  const [params] = useSearchParams()
  const token = params.get("token") ?? ""

  const { mutate, isPending, isIdle } = useMutation({
    mutationFn: () => client.api.auth["confirm-email"].post({ token }),
    onError: () => {
      toast.error("Failed to confirm email")
    },
    onSuccess: () => {
      toast.success("Email confirmed")
    }
  })

  useEffect(mutate, [])

  if (!token) {
    toast.error("Invalid token")
    return <Navigate to="/auth/login" />
  }

  return isPending || isIdle ? <LoadingIndicator /> : <Navigate to="/auth/login" />
}

export default ConfirmEmailPage
