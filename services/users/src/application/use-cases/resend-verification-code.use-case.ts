/**
 * Aplicación · Caso de uso: reenviar código de verificación.
 */
import { UserNotFoundError, VerificationEmailNotSentError } from '../../domain/errors/user.errors.js';
import { Email } from '../../domain/value-objects/email.js';
import { ResendVerificationCodeCommand, ResendVerificationCodePort } from '../ports/in/auth.ports.js';
import { UserRepository } from '../ports/out/user.repository.js';
import { VerificationNotifier } from '../ports/out/verification-notifier.js';
import { VerificationCodeIssuer } from '../services/verification-code-issuer.js';

/**
 * Genera un código nuevo para un usuario sin verificar, anula el anterior
 * (y su contador de intentos) y lo envía por correo. A diferencia del
 * registro, aquí un fallo de envío sí se propaga: el usuario pidió
 * explícitamente el correo y debe saber que no llegó.
 */
export class ResendVerificationCodeUseCase implements ResendVerificationCodePort {
  constructor(
    private readonly users: UserRepository,
    private readonly codeIssuer: VerificationCodeIssuer,
    private readonly notifier: VerificationNotifier,
  ) {}

  /**
   * @throws InvalidEmailError Si el correo no tiene formato válido.
   * @throws UserNotFoundError Si no hay cuenta con ese correo.
   * @throws EmailAlreadyVerifiedError Si ya estaba verificado.
   * @throws VerificationEmailNotSentError Si el correo no se pudo enviar.
   */
  async execute(command: ResendVerificationCodeCommand): Promise<void> {
    const user = await this.users.findByEmail(Email.create(command.email));
    if (!user) throw new UserNotFoundError();

    const code = this.codeIssuer.issue();
    user.renewVerificationCode(code);
    await this.users.save(user);

    try {
      await this.notifier.sendVerificationCode({
        to: user.email.value,
        name: user.name,
        code: code.code,
        expiresAt: code.expiresAt,
      });
    } catch {
      throw new VerificationEmailNotSentError();
    }
  }
}
