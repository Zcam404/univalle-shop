/**
 * Pruebas del agregado User: verificación de correo, acceso, perfil y direcciones.
 */
import { User } from '../../src/domain/entities/user.js';
import {
  AddressLimitReachedError,
  AddressNotFoundError,
  EmailAlreadyVerifiedError,
  EmailNotVerifiedError,
  InvalidAddressError,
  InvalidProfileDataError,
  InvalidVerificationCodeError,
  VerificationCodeExpiredError,
} from '../../src/domain/errors/user.errors.js';
import { Email } from '../../src/domain/value-objects/email.js';
import { Affiliation, Role } from '../../src/domain/value-objects/user-enums.js';
import { VerificationCode } from '../../src/domain/value-objects/verification-code.js';

const NOW = new Date('2026-01-15T10:00:00Z');
const EXPIRES = new Date('2026-01-15T10:15:00Z');

/** Crea un usuario recién registrado con el código 123456. */
function newUser(): User {
  return User.register({
    id: 'u1',
    name: '  Ana Pérez  ',
    email: Email.create('ana@correounivalle.edu.co'),
    passwordHash: 'hash',
    affiliation: Affiliation.STUDENT,
    verificationCode: VerificationCode.issue('123456', EXPIRES),
    createdAt: NOW,
  });
}

const casa = { label: 'Casa', street: 'Calle 13 # 100-00', city: 'Cali', department: 'Valle del Cauca' };

describe('User · registro', () => {
  it('nace como CUSTOMER, sin verificar y con el nombre limpio', () => {
    const user = newUser();
    expect(user.role).toBe(Role.CUSTOMER);
    expect(user.emailVerified).toBe(false);
    expect(user.name).toBe('Ana Pérez');
  });

  it('rechaza nombres demasiado cortos', () => {
    expect(() =>
      User.register({
        id: 'x',
        name: 'A',
        email: Email.create('a@b.co'),
        passwordHash: 'h',
        affiliation: Affiliation.STAFF,
        verificationCode: VerificationCode.issue('111111', EXPIRES),
        createdAt: NOW,
      }),
    ).toThrow(InvalidProfileDataError);
  });

  it('el administrador nace verificado y con rol ADMIN', () => {
    const admin = User.createAdmin({ id: 'a', name: 'Admin', email: Email.create('admin@x.co'), passwordHash: 'h', createdAt: NOW });
    expect(admin.role).toBe(Role.ADMIN);
    expect(() => admin.ensureCanLogIn()).not.toThrow();
  });
});

describe('User · verificación de correo', () => {
  it('no puede iniciar sesión antes de verificar', () => {
    expect(() => newUser().ensureCanLogIn()).toThrow(EmailNotVerifiedError);
  });

  it('se verifica con el código correcto y lo descarta', () => {
    const user = newUser();
    user.verifyEmail(' 123456 ', NOW);
    expect(user.emailVerified).toBe(true);
    expect(user.verificationCode).toBeNull();
    expect(() => user.ensureCanLogIn()).not.toThrow();
  });

  it('cuenta los intentos fallidos y bloquea el código al agotarlos', () => {
    const user = newUser();
    for (let i = VerificationCode.MAX_ATTEMPTS - 1; i >= 0; i--) {
      try {
        user.verifyEmail('000000', NOW);
      } catch (e) {
        expect(e).toBeInstanceOf(InvalidVerificationCodeError);
        expect((e as InvalidVerificationCodeError).remainingAttempts).toBe(i);
      }
    }
    // Aun con el código correcto, ya no sirve: hay que pedir otro.
    expect(() => user.verifyEmail('123456', NOW)).toThrow(VerificationCodeExpiredError);
  });

  it('rechaza un código vencido', () => {
    expect(() => newUser().verifyEmail('123456', EXPIRES)).toThrow(VerificationCodeExpiredError);
  });

  it('no se puede verificar ni renovar el código dos veces', () => {
    const user = newUser();
    user.verifyEmail('123456', NOW);
    expect(() => user.verifyEmail('123456', NOW)).toThrow(EmailAlreadyVerifiedError);
    expect(() => user.renewVerificationCode(VerificationCode.issue('999999', EXPIRES))).toThrow(EmailAlreadyVerifiedError);
  });
});

describe('User · perfil', () => {
  it('actualiza nombre y teléfono, normalizando el teléfono', () => {
    const user = newUser();
    user.updateProfile({ name: 'Ana María', phone: '+57 300-123-4567' });
    expect(user.name).toBe('Ana María');
    expect(user.phone).toBe('+573001234567');
  });

  it('borra el teléfono con null y deja intacto lo que no se envía', () => {
    const user = newUser();
    user.updateProfile({ phone: '3001234567' });
    user.updateProfile({ phone: null });
    expect(user.phone).toBeNull();
    expect(user.name).toBe('Ana Pérez');
  });

  it('rechaza teléfonos inválidos', () => {
    expect(() => newUser().updateProfile({ phone: '12ab' })).toThrow(InvalidProfileDataError);
  });
});

describe('User · direcciones', () => {
  it('la primera dirección queda como predeterminada', () => {
    const user = newUser();
    const a = user.addAddress('a1', casa);
    expect(a.isDefault).toBe(true);
  });

  it('marcar una nueva como predeterminada quita la marca a las demás', () => {
    const user = newUser();
    user.addAddress('a1', casa);
    user.addAddress('a2', { ...casa, label: 'Oficina' }, true);
    expect(user.addresses.filter((a) => a.isDefault).map((a) => a.id)).toEqual(['a2']);
  });

  it('al borrar la predeterminada, la primera restante pasa a serlo', () => {
    const user = newUser();
    user.addAddress('a1', casa);
    user.addAddress('a2', { ...casa, label: 'Oficina' });
    user.removeAddress('a1');
    expect(user.addresses[0].id).toBe('a2');
    expect(user.addresses[0].isDefault).toBe(true);
  });

  it('edita una dirección y la vuelve predeterminada', () => {
    const user = newUser();
    user.addAddress('a1', casa);
    user.addAddress('a2', casa);
    const edited = user.updateAddress('a2', { city: 'Palmira' }, true);
    expect(edited.toPrimitives()).toMatchObject({ city: 'Palmira', label: 'Casa', isDefault: true });
    expect(user.addresses.find((a) => a.id === 'a1')!.isDefault).toBe(false);
  });

  it('no permite más de 5 direcciones', () => {
    const user = newUser();
    for (let i = 0; i < User.MAX_ADDRESSES; i++) user.addAddress(`a${i}`, casa);
    expect(() => user.addAddress('extra', casa)).toThrow(AddressLimitReachedError);
  });

  it('valida campos obligatorios y direcciones inexistentes', () => {
    const user = newUser();
    expect(() => user.addAddress('a1', { ...casa, street: '   ' })).toThrow(InvalidAddressError);
    expect(() => user.removeAddress('nope')).toThrow(AddressNotFoundError);
  });
});
