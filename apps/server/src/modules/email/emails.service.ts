import { InternalServerError } from "elysia";
import { Resend } from "resend";

import EmailConfirmation from "transactional/emails/EmailConfirmation";
import ResetPassword from "transactional/emails/ResetPassword";
import env from "../../env";

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
      throw new InternalServerError("Failed to send email");
    }
  }
}

export const templates = {
  EmailConfirmation,
  ResetPassword,
};
