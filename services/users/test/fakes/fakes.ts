/**
 * Adaptadores falsos para las pruebas.
 *
 * Implementan los puertos de salida en memoria, sin MongoDB, SMTP ni JWT. Que
 * los casos de uso se puedan probar así demuestra que solo dependen de
 * interfaces (principio de inversión de dependencias).
 */
import { User } from '../../src/domain/entities/user.js';
import { Email } from '../../src/domain/value-objects/email.js';
import { Clock } from '../../src/application/ports/out/clock.js';
import { IdGenerator } from '../../src/application/ports/out/id-generator.js';
import { PasswordHasher } from '../../src/application/ports/out/password-hasher.js';
import { AccessToken, TokenClaims, TokenIssuer } from '../../src/application/ports/out/token-issuer.js';
import { UserRepository } from '../../src/application/ports/out/user.repository.js';
import { VerificationCodeGenerator } from '../../src/application/ports/out/verification-code-generator.js';
import { VerificationMessage, VerificationNotifier } from '../../src/application/ports/out/verification-notifier.js';

/** Repositorio en memoria. Cuenta los guardados para poder comprobarlos. */
export class InMemoryUserRepository implements UserRepository {
  readonly users = new Map<string, User>();
  saveCount = 0;

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    return [...this.users.values()].find((u) => u.email.equals(email)) ?? null;
  }

  async save(user: User): Promise<void> {
    this.saveCount++;
    this.users.set(user.id, user);
  }
}

/** "Cifra" anteponiendo un prefijo: suficiente para comprobar que no se guarda en claro. */
export class FakePasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`;
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    return hash === `hashed:${plain}`;
  }
}

/** Emite un token predecible y recuerda los datos con los que se pidió. */
export class FakeTokenIssuer implements TokenIssuer {
  lastClaims: TokenClaims | null = null;

  async issue(claims: TokenClaims): Promise<AccessToken> {
    this.lastClaims = claims;
    return { accessToken: `token-for-${claims.sub}`, expiresIn: 3600 };
  }
}

/** Siempre genera el mismo código, para poder escribirlo en las pruebas. */
export class FixedCodeGenerator implements VerificationCodeGenerator {
  constructor(public code = '123456') {}

  generate(): string {
    return this.code;
  }
}

/** Guarda los mensajes enviados; con `failNext` simula que el servidor de correo falla. */
export class FakeVerificationNotifier implements VerificationNotifier {
  readonly sent: VerificationMessage[] = [];
  failNext = false;

  async sendVerificationCode(message: VerificationMessage): Promise<void> {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('SMTP no disponible');
    }
    this.sent.push(message);
  }
}

/** Reloj con hora fija que se puede adelantar. */
export class FixedClock implements Clock {
  constructor(private current = new Date('2026-01-15T10:00:00Z')) {}

  now(): Date {
    return new Date(this.current);
  }

  advanceMinutes(minutes: number): void {
    this.current = new Date(this.current.getTime() + minutes * 60_000);
  }
}

/** Genera ids secuenciales: id-1, id-2, ... */
export class SequentialIdGenerator implements IdGenerator {
  private next = 1;

  generate(): string {
    return `id-${this.next++}`;
  }
}
