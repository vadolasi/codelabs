import { Resend } from "resend";
import env from "../../env";

import EmailConfirmation from "transactional/emails/EmailConfirmation";
import ResetPassword from "transactional/emails/ResetPassword";
import { HTTPError } from "../../error";

export default class EmailsService {
  private resend = new Resend(env.RESEND_API_KEY);

  async sendEmail(to: string, subject: string, template: JSX.Element) {
    const { error } = await this.resend.emails.send({
      from: "Codelabs <codelabs@vitordaniel.com>",
      to,
      subject,
      react: template,
    });

    if (error) {
      throw new HTTPError(500, "Error sending email");
    }
  }
}

export const templates = {
  EmailConfirmation,
  ResetPassword,
};
