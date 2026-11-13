/**
 * Pruebas de los value objects y de la política de correo institucional.
 */
import { InvalidEmailError, NotInstitutionalEmailError, WeakPasswordError } from '../../src/domain/errors/user.errors.js';
import { InstitutionalEmailPolicy } from '../../src/domain/services/institutional-email-policy.js';
import { Email } from '../../src/domain/value-objects/email.js';
import { PlainPassword } from '../../src/domain/value-objects/plain-password.js';
import { VerificationCode } from '../../src/domain/value-objects/verification-code.js';

describe('Email', () => {
  it('normaliza a minúsculas y quita espacios', () => {
    const email = Email.create('  Ana.Perez@CorreoUnivalle.edu.co ');
    expect(email.value).toBe('ana.perez@correounivalle.edu.co');
    expect(email.domain).toBe('correounivalle.edu.co');
  });

  it.each(['sin-arroba', 'a@b', 'con espacio@x.co', ''])('rechaza "%s"', (raw) => {
    expect(() => Email.create(raw)).toThrow(InvalidEmailError);
  });
});

describe('PlainPassword', () => {
  it('acepta una contraseña con letras y números de 8+ caracteres', () => {
    expect(PlainPassword.create('univalle2026').value).toBe('univalle2026');
  });

  it.each(['corta1', 'solotextolargo', '1234567890', 'a1'.repeat(40)])('rechaza "%s"', (raw) => {
    expect(() => PlainPassword.create(raw)).toThrow(WeakPasswordError);
  });
});

describe('InstitutionalEmailPolicy', () => {
  const policy = new InstitutionalEmailPolicy(['correounivalle.edu.co', '@univalle.edu.co']);

  it('acepta los dominios configurados (con o sin arroba)', () => {
    expect(policy.isInstitutional(Email.create('a@correounivalle.edu.co'))).toBe(true);
    expect(policy.isInstitutional(Email.create('b@univalle.edu.co'))).toBe(true);
  });

  it('rechaza otros dominios, incluso parecidos', () => {
    expect(() => policy.ensureInstitutional(Email.create('a@gmail.com'))).toThrow(NotInstitutionalEmailError);
    expect(policy.isInstitutional(Email.create('a@falso-univalle.edu.co'))).toBe(false);
    expect(policy.isInstitutional(Email.create('a@sub.univalle.edu.co'))).toBe(false);
  });

  it('no se puede crear sin dominios', () => {
    expect(() => new InstitutionalEmailPolicy([' '])).toThrow();
  });
});

describe('VerificationCode', () => {
  const now = new Date('2026-01-15T10:00:00Z');
  const in15 = new Date('2026-01-15T10:15:00Z');

  it('solo acepta 6 dígitos', () => {
    expect(() => VerificationCode.issue('12345', in15)).toThrow();
    expect(() => VerificationCode.issue('abcdef', in15)).toThrow();
    expect(VerificationCode.issue('012345', in15).code).toBe('012345');
  });

  it('vence en la fecha indicada', () => {
    const code = VerificationCode.issue('123456', in15);
    expect(code.isExpired(now)).toBe(false);
    expect(code.isExpired(in15)).toBe(true);
  });

  it('deja de ser usable al agotar los intentos', () => {
    let code = VerificationCode.issue('123456', in15);
    for (let i = 0; i < VerificationCode.MAX_ATTEMPTS; i++) code = code.withFailedAttempt();
    expect(code.remainingAttempts).toBe(0);
    expect(code.isUsable(now)).toBe(false);
  });
});
