/**
 * Aplicación · Caso de uso: registrar usuario.
 */
import { User } from '../../domain/entities/user.js';
import { EmailAlreadyRegisteredError } from '../../domain/errors/user.errors.js';
import { InstitutionalEmailPolicy } from '../../domain/services/institutional-email-policy.js';
import { Email } from '../../domain/value-objects/email.js';
import { PlainPassword } from '../../domain/value-objects/plain-password.js';
import { RegisterUserCommand, RegisterUserPort, RegisterUserResult } from '../ports/in/auth.ports.js';
import { Clock } from '../ports/out/clock.js';
import { IdGenerator } from '../ports/out/id-generator.js';
import { PasswordHasher } from '../ports/out/password-hasher.js';
import { UserRepository } from '../ports/out/user.repository.js';
import { VerificationNotifier } from '../ports/out/verification-notifier.js';
import { VerificationCodeIssuer } from '../services/verification-code-issuer.js';
import { toUserView } from '../views/user.view.js';

/**
 * Registra a un miembro de la comunidad Univalle.
 *
 * Pasos:
 * 1. Valida el formato del correo y que sea de un dominio institucional.
 * 2. Valida la política de contraseña.
 * 3. Comprueba que el correo no esté registrado.
 * 4. Crea el usuario sin verificar, con la contraseña cifrada y un código pendiente.
 * 5. Guarda el usuario y envía el código por correo.
 *
 * Si el correo no se puede enviar, la cuenta igual queda creada y el resultado
 * lo indica con `verificationEmailSent: false`: el usuario puede pedir un
 * reenvío en lugar de tener que registrarse otra vez.
 */
export class RegisterUserUseCase implements RegisterUserPort {
  constructor(
    private readonly users: UserRepository,
    private readonly emailPolicy: InstitutionalEmailPolicy,
    private readonly passwordHasher: PasswordHasher,
    private readonly ids: IdGenerator,
    private readonly codeIssuer: VerificationCodeIssuer,
    private readonly notifier: VerificationNotifier,
    private readonly clock: Clock,
  ) {}

  /**
   * @throws InvalidEmailError Si el correo no tiene formato válido.
   * @throws NotInstitutionalEmailError Si el correo no es de Univalle.
   * @throws WeakPasswordError Si la contraseña no cumple la política.
   * @throws EmailAlreadyRegisteredError Si el correo ya tiene cuenta.
   * @throws InvalidProfileDataError Si el nombre no es válido.
   */
  async execute(command: RegisterUserCommand): Promise<RegisterUserResult> {
    const email = Email.create(command.email);
    this.emailPolicy.ensureInstitutional(email);
    const password = PlainPassword.create(command.password);

    if (await this.users.findByEmail(email)) {
      throw new EmailAlreadyRegisteredError();
    }

    const user = User.register({
      id: this.ids.generate(),
      name: command.name,
      email,
      passwordHash: await this.passwordHasher.hash(password.value),
      affiliation: command.affiliation,
      verificationCode: this.codeIssuer.issue(),
      createdAt: this.clock.now(),
    });
    await this.users.save(user);

    const verificationEmailSent = await this.trySendVerificationCode(user);
    return { user: toUserView(user), verificationEmailSent };
  }

  /** Envía el código al usuario y devuelve si se pudo enviar, sin propagar el error. */
  private async trySendVerificationCode(user: User): Promise<boolean> {
    const code = user.verificationCode!;
    try {
      await this.notifier.sendVerificationCode({
        to: user.email.value,
        name: user.name,
        code: code.code,
        expiresAt: code.expiresAt,
      });
      return true;
    } catch {
      return false;
    }
  }
}
