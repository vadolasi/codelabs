import Elysia, { t } from "elysia"
import { convert } from "html-to-text"
import juice from "juice"
import rehypeStringify from "rehype-stringify"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import { Resend } from "resend"
import { unified } from "unified"
import { db, users } from "../../database"
import config from "../../lib/config"
import authMiddleware from "../auth/auth.middleware"

const adminController = new Elysia({
  name: "api.admin",
  prefix: "/admin"
})
  .use(authMiddleware)
  .post(
    "/broadcast",
    async ({ body: { subject, markdown } }) => {
      const file = await unified()
        .use(remarkParse)
        .use(remarkRehype)
        .use(rehypeStringify)
        .process(markdown)

      const contentHtml = String(file)

      const layout = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
    .logo { font-size: 24px; font-weight: bold; color: #3b82f6; text-decoration: none; }
    .content { font-size: 16px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #888; }
    a { color: #3b82f6; text-decoration: none; }
    a:hover { text-decoration: underline; }
    h1, h2, h3 { color: #111; margin-top: 0; }
    blockquote { border-left: 4px solid #e5e7eb; margin: 0; padding-left: 16px; color: #555; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.9em; }
    pre { background: #f3f4f6; padding: 16px; border-radius: 8px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    img { max-width: 100%; height: auto; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="${config.DOMAIN}" class="logo">Codelabs</a>
    </div>
    <div class="content">
      ${contentHtml}
    </div>
    <div class="footer">
      <p>Enviado via Codelabs Broadcast</p>
      <p>© ${new Date().getFullYear()} Codelabs. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>
      `

      const html = juice(layout)
      const text = convert(html, { wordwrap: 130 })

      const allUsers = await db.select({ email: users.email }).from(users)
      const recipients = allUsers.map((u) => u.email)

      if (config.NODE_ENV === "development" && !config.RESEND_API_KEY) {
        console.log("\u001b[35m[BROADCAST SIMULADO]\u001b[0m")
        console.log(`Assunto: ${subject}`)
        console.log(
          `Destinatários (${recipients.length}):`,
          recipients.slice(0, 5),
          recipients.length > 5 ? "..." : ""
        )
        console.log("--- HTML Preview (Juiced) ---")
        console.log(`${html.slice(0, 500)}...`)
        console.log("-----------------------------")
        return { count: recipients.length }
      }

      const resend = new Resend(config.RESEND_API_KEY)

      const { data, error } = await resend.broadcasts.create({
        from: `Codelabs <${config.MAIL_FROM}>`,
        subject,
        html,
        text,
        segmentId: "656dc7f2-37c4-4246-909a-1d66b56b7b80"
      })

      if (error) {
        console.error("Failed to create broadcast:", error)
        throw new Error("Failed to send broadcast email")
      }

      await resend.broadcasts.send(data.id)

      return { count: recipients.length }
    },
    {
      body: t.Object({
        subject: t.String(),
        markdown: t.String()
      })
    }
  )

export default adminController
