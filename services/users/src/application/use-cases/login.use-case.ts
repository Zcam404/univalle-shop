/**
 * Aplicación · Caso de uso: iniciar sesión.
 */
import { InvalidCredentialsError } from '../../domain/errors/user.errors.js';
import { Email } from '../../domain/value-objects/email.js';
import { LoginCommand, LoginPort, LoginResult } from '../ports/in/auth.ports.js';
import { PasswordHasher } from '../ports/out/password-hasher.js';
import { TokenIssuer } from '../ports/out/token-issuer.js';
import { UserRepository } from '../ports/out/user.repository.js';
import { toUserView } from '../views/user.view.js';

/**
 * Comprueba correo y contraseña y, si el correo ya está verificado, emite un
 * token de acceso con el id, el correo y el rol del usuario.
 *
 * Un correo inexistente y una contraseña incorrecta producen el mismo error,
 * para no revelar qué correos tienen cuenta. La verificación del correo se
 * revisa después de la contraseña por la misma razón.
 */
export class LoginUseCase implements LoginPort {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenIssuer: TokenIssuer,
  ) {}

  /**
   * @throws InvalidCredentialsError Si el correo no existe o la contraseña no coincide.
   * @throws EmailNotVerifiedError Si las credenciales son correctas pero el correo no está verificado.
   */
  async execute(command: LoginCommand): Promise<LoginResult> {
    let email: Email;
    try {
      email = Email.create(command.email);
    } catch {
      throw new InvalidCredentialsError();
    }

    const user = await this.users.findByEmail(email);
    if (!user || !(await this.passwordHasher.compare(command.password, user.passwordHash))) {
      throw new InvalidCredentialsError();
    }
    user.ensureCanLogIn();

    const token = await this.tokenIssuer.issue({ sub: user.id, email: user.email.value, role: user.role });
    return { ...token, user: toUserView(user) };
  }
}
