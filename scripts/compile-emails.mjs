import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import Handlebars from "handlebars"
import mjml2html from "mjml"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const templatesDir = path.resolve(__dirname, "../src/backend/emails/templates")
const outputFile = path.resolve(
  __dirname,
  "../src/backend/emails/templates.generated.ts"
)

const templates = ["emailVerification", "resetPassword", "workspaceInvite"]

await mkdir(path.dirname(outputFile), { recursive: true })

const compiledEntries = []

for (const name of templates) {
  const templatePath = path.join(templatesDir, `${name}.mjml.hbs`)
  const mjmlSource = await readFile(templatePath, "utf-8")
  const { html, errors } = mjml2html(mjmlSource)

  if (errors?.length) {
    const details = errors.map((err) => err.formattedMessage).join("\n")
    throw new Error(`MJML compile failed for ${name}:\n${details}`)
  }

  const precompiled = Handlebars.precompile(html, { noEscape: true })
  compiledEntries.push({ name, precompiled })
}

const output = `\nimport Handlebars from "handlebars/runtime"\n\n${compiledEntries
  .map(
    (entry) =>
      `const ${entry.name}Template = Handlebars.template(${entry.precompiled})`
  )
  .join(
    "\n"
  )}\n\nexport function renderEmailVerification(data) {\n\treturn emailVerificationTemplate(data)\n}\n\nexport function renderResetPassword(data) {\n\treturn resetPasswordTemplate(data)\n}\n\nexport function renderWorkspaceInvite(data) {\n\treturn workspaceInviteTemplate(data)\n}\n\nexport const availableEmailTemplates = [\n\t"emailVerification",\n\t"resetPassword",\n\t"workspaceInvite"\n]\n`

await writeFile(outputFile, output)

console.log(`Generated ${path.relative(process.cwd(), outputFile)}`)
