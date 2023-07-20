// @ts-ignore
import { yCollab } from "y-codemirror.next"
import { useLocation } from "wouter-preact"
import { graphql } from "../gql"
import { useMutation } from "urql"
import { useEffect } from "preact/hooks"
import toast from "react-hot-toast"
import jwt_decode from "jwt-decode"
import { useStore } from "../store"
import Workspace from "../components/Workspace"
import Sidebar from "../components/Sidebar"
import { getProviderArray } from "../utils"

const joinRoomMutation = graphql(/* GraphQL */`
  mutation JoinRoom($username: String!, $roomId: String!) {
    joinRoom(
      username: $username
      id: $roomId
    )
  }
`)

interface Props {
  id: string
}

function getPermission(document: string, roles: string[]): "write" | "read" | "none" {
  const availableRoles = roles
    .filter(role => role.startsWith(document) || role.startsWith("*"))
    .map(role => role.split(":")[1])

  if (availableRoles.includes("write")) {
    return "write"
  } else if (availableRoles.includes("read")) {
    return "read"
  }

  return "none"
}

export default function Editor({ id }: Props) {
  const { workspaces, setToken, addWorkspace } = useStore()

  const [, executeJoinRoom] = useMutation(joinRoomMutation)
  const [, navigate] = useLocation()

  useEffect(() => {
    executeJoinRoom({ roomId: id, username: "vadolasi" })
      .then(({ data, error }) => {
        if (error) {
          switch (error.message) {
            case "[GraphQL] Room not found":
              navigate("/")
              toast.error("A sala que você está tentando acessar não foi encontrada")
          }
        } else {
          const token = data?.joinRoom!
          setToken(token)
          const { roles } = jwt_decode<{ roles: string[] }>(token)

          const mainPermission = getPermission("__main__", roles)

          if (mainPermission === "none") {
            addWorkspace(id, `user|vadolasi`, false, getProviderArray(`${id}:user|vadolasi:__files__`))
          } else {
            addWorkspace(id, "__main__", mainPermission === "read", getProviderArray(`${id}:__main__:__files__`))
          }
        }
      })
  }, [])

  return (
    <div _w="screen" _h="screen" _flex="~">
      <Sidebar />
      <div _flex="~" _w="full" _h="full">
        {Object.values(workspaces).map(workspace => (
          <Workspace key={id} id={workspace.id} />
        ))}
      </div>
    </div>
  )
}
