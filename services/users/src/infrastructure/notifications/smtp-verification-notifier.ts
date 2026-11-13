/**
 * Infraestructura · Adaptador de salida `SmtpVerificationNotifier`.
 *
 * Implementa el puerto `VerificationNotifier` enviando el código por correo
 * con SMTP. En desarrollo apunta a MailHog, que captura los correos y los
 * muestra en http://localhost:8025 sin enviarlos de verdad.
 */
import nodemailer, { Transporter } from 'nodemailer';
import {
  VerificationMessage,
  VerificationNotifier,
} from '../../application/ports/out/verification-notifier.js';

export class SmtpVerificationNotifier implements VerificationNotifier {
  private readonly transporter: Transporter;

  /**
   * @param smtp Servidor SMTP y remitente de los correos.
   */
  constructor(private readonly smtp: { host: string; port: number; from: string }) {
    this.transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: false,
      // Si el servidor de correo no responde, se falla rápido en lugar de bloquear el registro.
      connectionTimeout: 5_000,
      greetingTimeout: 5_000,
      socketTimeout: 10_000,
    });
  }

  /** Envía el correo con el código en texto plano y en HTML. */
  async sendVerificationCode(message: VerificationMessage): Promise<void> {
    const expiresAt = message.expiresAt.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Bogota',
    });

    await this.transporter.sendMail({
      from: this.smtp.from,
      to: message.to,
      subject: `Tu código de verificación de Univalle Shop: ${message.code}`,
      text:
        `Hola ${message.name},\n\n` +
        `Tu código de verificación es: ${message.code}\n\n` +
        `Vence a las ${expiresAt} (hora de Colombia). Si no creaste una cuenta en Univalle Shop, ignora este correo.`,
      html:
        `<p>Hola ${escapeHtml(message.name)},</p>` +
        `<p>Tu código de verificación es:</p>` +
        `<p style="font-size:28px;font-weight:bold;letter-spacing:6px">${message.code}</p>` +
        `<p>Vence a las ${expiresAt} (hora de Colombia). Si no creaste una cuenta en Univalle Shop, ignora este correo.</p>`,
    });
  }
}

/** Escapa los caracteres especiales para que el nombre del usuario no inyecte HTML en el correo. */
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
