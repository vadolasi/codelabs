import { useMutation } from "urql"
import Button from "../components/Button"
import { graphql } from "../gql"
import { toast } from "react-hot-toast"
import { useLocation } from "wouter-preact"

const createRoomMutation = graphql(/* GraphQL */`
  mutation CreateRoom($username: String!) {
    createRoom(username: $username) {
      id
    }
  }
`)

export default function Home() {
  const [, execute] = useMutation(createRoomMutation)
  const [, navigate] = useLocation()

  const _createRoom = async () => {
    const { error, data } = await execute({ username: "vadolasi" })
    if (error) {
      throw error
    } else if (data) {
      navigate(`/room/${data.createRoom.id}`)
    }
  }

  const createRoom = async () => {
    await toast.promise(
      _createRoom(),
      {
        loading: "Criando sala",
        success: "Sala criada com sucesso!",
        error: "Ocorreu um erro ao cria a sala!"
      }
    )
  }

  return (
    <>
      <Button onClick={createRoom}>Teste</Button>
    </>
  )
}
