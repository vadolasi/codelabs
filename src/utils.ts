import { HocuspocusProvider } from "@hocuspocus/provider"
import { useStore } from "./store"
import { YKeyValue } from "y-utility/y-keyvalue"

const urlObject = new URL("/", location.href)
urlObject.protocol = urlObject.protocol.replace("http", "ws").replace("https", "wss")
const url = urlObject.href

export function getProvider(room: string) {
  return new HocuspocusProvider({
    url,
    name: room,
    token: useStore.getState().token
  })
}


export function getProviderArray<T>(room: string) {
  const { document } = getProvider(room)

  return new YKeyValue<T>(document.getArray<{ key: string, val: T }>("files"))
}
