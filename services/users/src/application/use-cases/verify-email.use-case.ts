/**
 * Aplicación · Caso de uso: verificar correo.
 */
import { InvalidVerificationCodeError, UserNotFoundError } from '../../domain/errors/user.errors.js';
import { Email } from '../../domain/value-objects/email.js';
import { VerifyEmailCommand, VerifyEmailPort } from '../ports/in/auth.ports.js';
import { Clock } from '../ports/out/clock.js';
import { UserRepository } from '../ports/out/user.repository.js';
import { UserView, toUserView } from '../views/user.view.js';

/**
 * Marca como verificado el correo del usuario si el código coincide.
 * Cuando el código es incorrecto, el usuario se guarda igual antes de
 * propagar el error: así el intento fallido queda contado y no se puede
 * probar códigos sin límite.
 */
export class VerifyEmailUseCase implements VerifyEmailPort {
  constructor(
    private readonly users: UserRepository,
    private readonly clock: Clock,
  ) {}

  /**
   * @throws InvalidEmailError Si el correo no tiene formato válido.
   * @throws UserNotFoundError Si no hay cuenta con ese correo.
   * @throws EmailAlreadyVerifiedError Si ya estaba verificado.
   * @throws VerificationCodeExpiredError Si el código venció o se agotaron los intentos.
   * @throws InvalidVerificationCodeError Si el código no coincide.
   */
  async execute(command: VerifyEmailCommand): Promise<UserView> {
    const user = await this.users.findByEmail(Email.create(command.email));
    if (!user) throw new UserNotFoundError();

    try {
      user.verifyEmail(command.code, this.clock.now());
    } catch (error) {
      if (error instanceof InvalidVerificationCodeError) {
        await this.users.save(user);
      }
      throw error;
    }

    await this.users.save(user);
    return toUserView(user);
  }
}
