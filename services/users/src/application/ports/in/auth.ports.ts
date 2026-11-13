/**
 * Aplicación · Puertos de entrada de autenticación.
 *
 * Definen qué operaciones de registro y acceso ofrece el servicio, con sus
 * datos de entrada y de salida. Los controladores HTTP dependen de estas
 * interfaces (y sus tokens), no de las clases que las implementan.
 */
import { Affiliation } from '../../../domain/value-objects/user-enums.js';
import { UserView } from '../../views/user.view.js';

// --- Registro ---------------------------------------------------------------

export const REGISTER_USER = Symbol('RegisterUser');

export interface RegisterUserCommand {
  name: string;
  email: string;
  password: string;
  affiliation: Affiliation;
}

export interface RegisterUserResult {
  user: UserView;
  /** `false` si la cuenta se creó pero el correo no se pudo enviar (se puede pedir reenvío). */
  verificationEmailSent: boolean;
}

/** Registra a un miembro de la comunidad Univalle y le envía su código de verificación. */
export interface RegisterUserPort {
  execute(command: RegisterUserCommand): Promise<RegisterUserResult>;
}

// --- Verificación de correo -------------------------------------------------

export const VERIFY_EMAIL = Symbol('VerifyEmail');

export interface VerifyEmailCommand {
  email: string;
  code: string;
}

/** Marca el correo como verificado si el código es correcto. */
export interface VerifyEmailPort {
  execute(command: VerifyEmailCommand): Promise<UserView>;
}

// --- Reenvío de código ------------------------------------------------------

export const RESEND_VERIFICATION_CODE = Symbol('ResendVerificationCode');

export interface ResendVerificationCodeCommand {
  email: string;
}

/** Genera un código nuevo (anulando el anterior) y lo envía al correo. */
export interface ResendVerificationCodePort {
  execute(command: ResendVerificationCodeCommand): Promise<void>;
}

// --- Inicio de sesión -------------------------------------------------------

export const LOGIN = Symbol('Login');

export interface LoginCommand {
  email: string;
  password: string;
}

export interface LoginResult {
  accessToken: string;
  /** Segundos hasta que vence el token. */
  expiresIn: number;
  user: UserView;
}

/** Comprueba las credenciales y emite un token de acceso. */
export interface LoginPort {
  execute(command: LoginCommand): Promise<LoginResult>;
}
