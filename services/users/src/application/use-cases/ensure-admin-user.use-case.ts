/**
 * Aplicación · Caso de uso: asegurar la cuenta administradora.
 */
import { User } from '../../domain/entities/user.js';
import { Email } from '../../domain/value-objects/email.js';
import { PlainPassword } from '../../domain/value-objects/plain-password.js';
import { EnsureAdminUserCommand, EnsureAdminUserPort } from '../ports/in/admin.ports.js';
import { Clock } from '../ports/out/clock.js';
import { IdGenerator } from '../ports/out/id-generator.js';
import { PasswordHasher } from '../ports/out/password-hasher.js';
import { UserRepository } from '../ports/out/user.repository.js';

/**
 * Crea la cuenta administradora de la tienda si no existe todavía. No exige
 * correo institucional ni verificación, porque la define el equipo en la
 * configuración del despliegue. Si ya existe una cuenta con ese correo no la
 * modifica (no cambia su contraseña ni su rol).
 */
export class EnsureAdminUserUseCase implements EnsureAdminUserPort {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  /**
   * @returns `true` si la creó; `false` si ya existía.
   * @throws InvalidEmailError | WeakPasswordError Si la configuración tiene datos inválidos.
   */
  async execute(command: EnsureAdminUserCommand): Promise<boolean> {
    const email = Email.create(command.email);
    if (await this.users.findByEmail(email)) return false;

    const password = PlainPassword.create(command.password);
    const admin = User.createAdmin({
      id: this.ids.generate(),
      name: command.name,
      email,
      passwordHash: await this.passwordHasher.hash(password.value),
      createdAt: this.clock.now(),
    });
    await this.users.save(admin);
    return true;
  }
}
