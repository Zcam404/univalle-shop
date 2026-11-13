/**
 * Pruebas de los casos de uso de registro, verificación, reenvío e inicio de sesión.
 */
import { LoginUseCase } from '../../src/application/use-cases/login.use-case.js';
import { RegisterUserUseCase } from '../../src/application/use-cases/register-user.use-case.js';
import { ResendVerificationCodeUseCase } from '../../src/application/use-cases/resend-verification-code.use-case.js';
import { VerifyEmailUseCase } from '../../src/application/use-cases/verify-email.use-case.js';
import { EnsureAdminUserUseCase } from '../../src/application/use-cases/ensure-admin-user.use-case.js';
import { VerificationCodeIssuer } from '../../src/application/services/verification-code-issuer.js';
import {
  EmailAlreadyRegisteredError,
  EmailNotVerifiedError,
  InvalidCredentialsError,
  InvalidVerificationCodeError,
  NotInstitutionalEmailError,
  UserNotFoundError,
  VerificationEmailNotSentError,
  VerificationCodeExpiredError,
  WeakPasswordError,
} from '../../src/domain/errors/user.errors.js';
import { InstitutionalEmailPolicy } from '../../src/domain/services/institutional-email-policy.js';
import { Affiliation, Role } from '../../src/domain/value-objects/user-enums.js';
import {
  FakePasswordHasher,
  FakeTokenIssuer,
  FakeVerificationNotifier,
  FixedClock,
  FixedCodeGenerator,
  InMemoryUserRepository,
  SequentialIdGenerator,
} from '../fakes/fakes.js';

/** Arma todos los casos de uso con adaptadores falsos compartidos. */
function setup() {
  const users = new InMemoryUserRepository();
  const hasher = new FakePasswordHasher();
  const tokens = new FakeTokenIssuer();
  const codes = new FixedCodeGenerator('123456');
  const notifier = new FakeVerificationNotifier();
  const clock = new FixedClock();
  const ids = new SequentialIdGenerator();
  const issuer = new VerificationCodeIssuer(codes, clock, 15);
  const policy = new InstitutionalEmailPolicy(['correounivalle.edu.co']);

  return {
    users,
    hasher,
    tokens,
    codes,
    notifier,
    clock,
    register: new RegisterUserUseCase(users, policy, hasher, ids, issuer, notifier, clock),
    verify: new VerifyEmailUseCase(users, clock),
    resend: new ResendVerificationCodeUseCase(users, issuer, notifier),
    login: new LoginUseCase(users, hasher, tokens),
    ensureAdmin: new EnsureAdminUserUseCase(users, hasher, ids, clock),
  };
}

const ana = {
  name: 'Ana Pérez',
  email: 'Ana@CorreoUnivalle.edu.co',
  password: 'univalle2026',
  affiliation: Affiliation.STUDENT,
};

describe('RegisterUserUseCase', () => {
  it('registra al usuario sin verificar, con la contraseña cifrada, y envía el código', async () => {
    const t = setup();
    const result = await t.register.execute(ana);

    expect(result.verificationEmailSent).toBe(true);
    expect(result.user).toMatchObject({ email: 'ana@correounivalle.edu.co', role: Role.CUSTOMER, emailVerified: false });
    expect(result.user).not.toHaveProperty('passwordHash');

    const stored = [...t.users.users.values()][0];
    expect(stored.passwordHash).toBe('hashed:univalle2026');
    expect(t.notifier.sent).toEqual([
      { to: 'ana@correounivalle.edu.co', name: 'Ana Pérez', code: '123456', expiresAt: new Date('2026-01-15T10:15:00Z') },
    ]);
  });

  it('rechaza correos que no son de Univalle', async () => {
    await expect(setup().register.execute({ ...ana, email: 'ana@gmail.com' })).rejects.toThrow(NotInstitutionalEmailError);
  });

  it('rechaza contraseñas débiles', async () => {
    await expect(setup().register.execute({ ...ana, password: 'abc' })).rejects.toThrow(WeakPasswordError);
  });

  it('rechaza correos ya registrados', async () => {
    const t = setup();
    await t.register.execute(ana);
    await expect(t.register.execute({ ...ana, email: 'ana@correounivalle.edu.co' })).rejects.toThrow(
      EmailAlreadyRegisteredError,
    );
  });

  it('si el correo no se puede enviar, la cuenta igual se crea', async () => {
    const t = setup();
    t.notifier.failNext = true;
    const result = await t.register.execute(ana);
    expect(result.verificationEmailSent).toBe(false);
    expect(t.users.users.size).toBe(1);
  });
});

describe('VerifyEmailUseCase', () => {
  it('verifica el correo con el código correcto', async () => {
    const t = setup();
    await t.register.execute(ana);
    const view = await t.verify.execute({ email: ana.email, code: '123456' });
    expect(view.emailVerified).toBe(true);
  });

  it('guarda el intento fallido aunque lance el error', async () => {
    const t = setup();
    await t.register.execute(ana);
    const savesBefore = t.users.saveCount;

    await expect(t.verify.execute({ email: ana.email, code: '000000' })).rejects.toThrow(InvalidVerificationCodeError);
    expect(t.users.saveCount).toBe(savesBefore + 1);
    expect([...t.users.users.values()][0].verificationCode!.failedAttempts).toBe(1);
  });

  it('rechaza el código después de 15 minutos', async () => {
    const t = setup();
    await t.register.execute(ana);
    t.clock.advanceMinutes(15);
    await expect(t.verify.execute({ email: ana.email, code: '123456' })).rejects.toThrow(VerificationCodeExpiredError);
  });

  it('falla si el correo no tiene cuenta', async () => {
    await expect(setup().verify.execute({ email: 'x@correounivalle.edu.co', code: '123456' })).rejects.toThrow(
      UserNotFoundError,
  VerificationEmailNotSentError,
    );
  });
});

describe('ResendVerificationCodeUseCase', () => {
  it('reemplaza el código vencido por uno nuevo que sí funciona', async () => {
    const t = setup();
    await t.register.execute(ana);
    t.clock.advanceMinutes(20);
    t.codes.code = '654321';

    await t.resend.execute({ email: ana.email });

    expect(t.notifier.sent.at(-1)!.code).toBe('654321');
    const view = await t.verify.execute({ email: ana.email, code: '654321' });
    expect(view.emailVerified).toBe(true);
  });

  it('propaga el error si el correo no se puede enviar', async () => {
    const t = setup();
    await t.register.execute(ana);
    t.notifier.failNext = true;
    await expect(t.resend.execute({ email: ana.email })).rejects.toThrow(VerificationEmailNotSentError);
  });
});

describe('LoginUseCase', () => {
  it('emite un token con id, correo y rol cuando el correo está verificado', async () => {
    const t = setup();
    const { user } = await t.register.execute(ana);
    await t.verify.execute({ email: ana.email, code: '123456' });

    const result = await t.login.execute({ email: ana.email, password: ana.password });

    expect(result.accessToken).toBe(`token-for-${user.id}`);
    expect(t.tokens.lastClaims).toEqual({ sub: user.id, email: 'ana@correounivalle.edu.co', role: Role.CUSTOMER });
  });

  it('exige verificar el correo, pero solo si la contraseña es correcta', async () => {
    const t = setup();
    await t.register.execute(ana);
    await expect(t.login.execute({ email: ana.email, password: ana.password })).rejects.toThrow(EmailNotVerifiedError);
    await expect(t.login.execute({ email: ana.email, password: 'otra1234' })).rejects.toThrow(InvalidCredentialsError);
  });

  it('da el mismo error para correo inexistente o mal escrito', async () => {
    const t = setup();
    await expect(t.login.execute({ email: 'nadie@correounivalle.edu.co', password: 'x' })).rejects.toThrow(
      InvalidCredentialsError,
    );
    await expect(t.login.execute({ email: 'no-es-correo', password: 'x' })).rejects.toThrow(InvalidCredentialsError);
  });
});

describe('EnsureAdminUserUseCase', () => {
  it('crea el admin una sola vez y puede iniciar sesión sin verificar', async () => {
    const t = setup();
    const admin = { name: 'Admin Tienda', email: 'admin@univalleshop.local', password: 'Admin12345' };

    expect(await t.ensureAdmin.execute(admin)).toBe(true);
    expect(await t.ensureAdmin.execute(admin)).toBe(false);

    const result = await t.login.execute({ email: admin.email, password: admin.password });
    expect(result.user.role).toBe(Role.ADMIN);
  });
});
