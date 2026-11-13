/**
 * Dominio · Errores de negocio del servicio de Usuarios.
 *
 * Cada clase representa una regla de negocio que se incumplió. Los casos de uso
 * las lanzan y el adaptador HTTP las convierte en respuestas con el código de
 * estado que corresponde a su `kind`.
 */
import { DomainError } from './domain.error.js';

/** El texto recibido no tiene formato de correo electrónico. */
export class InvalidEmailError extends DomainError {
  readonly kind = 'validation';
  readonly code = 'INVALID_EMAIL';

  constructor(email: string) {
    super(`"${email}" no es un correo electrónico válido.`);
  }
}

/** El correo no pertenece a un dominio de la Universidad del Valle. */
export class NotInstitutionalEmailError extends DomainError {
  readonly kind = 'forbidden';
  readonly code = 'NOT_INSTITUTIONAL_EMAIL';

  /**
   * @param allowedDomains Dominios aceptados, para indicarle al usuario cuáles puede usar.
   */
  constructor(allowedDomains: readonly string[]) {
    super(
      `Solo pueden registrarse integrantes de la Universidad del Valle. ` +
        `Usa un correo de: ${allowedDomains.map((d) => '@' + d).join(', ')}.`,
    );
  }
}

/** La contraseña no cumple la política mínima de seguridad. */
export class WeakPasswordError extends DomainError {
  readonly kind = 'validation';
  readonly code = 'WEAK_PASSWORD';
}

/** Ya existe una cuenta con ese correo. */
export class EmailAlreadyRegisteredError extends DomainError {
  readonly kind = 'conflict';
  readonly code = 'EMAIL_ALREADY_REGISTERED';

  constructor() {
    super('Ya existe una cuenta registrada con ese correo.');
  }
}

/**
 * Correo o contraseña incorrectos. El mensaje es el mismo en ambos casos para
 * no revelar si un correo está registrado.
 */
export class InvalidCredentialsError extends DomainError {
  readonly kind = 'unauthorized';
  readonly code = 'INVALID_CREDENTIALS';

  constructor() {
    super('Correo o contraseña incorrectos.');
  }
}

/** El usuario intenta iniciar sesión sin haber verificado su correo. */
export class EmailNotVerifiedError extends DomainError {
  readonly kind = 'forbidden';
  readonly code = 'EMAIL_NOT_VERIFIED';

  constructor() {
    super('Debes verificar tu correo antes de iniciar sesión.');
  }
}

/** El correo ya fue verificado; no hace falta otro código. */
export class EmailAlreadyVerifiedError extends DomainError {
  readonly kind = 'conflict';
  readonly code = 'EMAIL_ALREADY_VERIFIED';

  constructor() {
    super('Este correo ya fue verificado.');
  }
}

/** El código de verificación no coincide. */
export class InvalidVerificationCodeError extends DomainError {
  readonly kind = 'validation';
  readonly code = 'INVALID_VERIFICATION_CODE';

  /**
   * @param remainingAttempts Intentos que le quedan al usuario antes de tener que pedir otro código.
   */
  constructor(readonly remainingAttempts: number) {
    super(
      remainingAttempts > 0
        ? `El código no es correcto. Te quedan ${remainingAttempts} intento(s).`
        : 'El código no es correcto y ya no quedan intentos. Solicita un código nuevo.',
    );
  }
}

/** El código venció, se agotaron sus intentos o nunca se generó uno. */
export class VerificationCodeExpiredError extends DomainError {
  readonly kind = 'validation';
  readonly code = 'VERIFICATION_CODE_EXPIRED';

  constructor() {
    super('El código de verificación ya no es válido. Solicita un código nuevo.');
  }
}

/** El correo con el código no se pudo enviar (servidor de correo caído); se puede reintentar. */
export class VerificationEmailNotSentError extends DomainError {
  readonly kind = 'unavailable';
  readonly code = 'VERIFICATION_EMAIL_NOT_SENT';

  constructor() {
    super('No pudimos enviar el correo con el código. Intenta de nuevo en unos minutos.');
  }
}

/** Los datos del perfil (nombre, teléfono) no son válidos. */
export class InvalidProfileDataError extends DomainError {
  readonly kind = 'validation';
  readonly code = 'INVALID_PROFILE_DATA';
}

/** Los datos de una dirección no son válidos. */
export class InvalidAddressError extends DomainError {
  readonly kind = 'validation';
  readonly code = 'INVALID_ADDRESS';
}

/** El usuario ya tiene el máximo de direcciones permitido. */
export class AddressLimitReachedError extends DomainError {
  readonly kind = 'conflict';
  readonly code = 'ADDRESS_LIMIT_REACHED';

  constructor(max: number) {
    super(`Solo puedes guardar hasta ${max} direcciones.`);
  }
}

/** No existe un usuario con el identificador o correo indicado. */
export class UserNotFoundError extends DomainError {
  readonly kind = 'not_found';
  readonly code = 'USER_NOT_FOUND';

  constructor() {
    super('No se encontró el usuario.');
  }
}

/** El usuario no tiene una dirección con ese identificador. */
export class AddressNotFoundError extends DomainError {
  readonly kind = 'not_found';
  readonly code = 'ADDRESS_NOT_FOUND';

  constructor() {
    super('No se encontró la dirección.');
  }
}
