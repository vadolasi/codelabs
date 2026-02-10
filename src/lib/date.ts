import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import "dayjs/locale/pt-br"

dayjs.extend(relativeTime)
dayjs.locale("pt-br")

export function formatDate(date: Date): string {
  return dayjs(date).format("DD/MM/YYYY [às] HH:mm")
}

export function formatRelativeTime(date: Date) {
  const now = dayjs()
  const dateToFormart = dayjs(date)

  if (now.diff(dateToFormart, "year") >= 1) {
    return formatDate(date)
  }

  return dateToFormart.fromNow()
}
