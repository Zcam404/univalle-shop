/**
 * Dominio · Agregado `User`.
 *
 * Es la raíz del agregado de usuarios: concentra los datos de la cuenta y sus
 * direcciones, y protege todas sus reglas de negocio:
 * - una cuenta nueva nace sin verificar y con rol `CUSTOMER`;
 * - solo se verifica con un código vigente y con intentos disponibles;
 * - no se puede iniciar sesión sin verificar el correo;
 * - máximo 5 direcciones y siempre exactamente una predeterminada (si hay alguna).
 *
 * Desde fuera solo se cambia a través de sus métodos, nunca editando sus datos
 * directamente.
 */
import {
  AddressLimitReachedError,
  AddressNotFoundError,
  EmailAlreadyVerifiedError,
  EmailNotVerifiedError,
  InvalidProfileDataError,
  InvalidVerificationCodeError,
  VerificationCodeExpiredError,
} from '../errors/user.errors.js';
import { Email } from '../value-objects/email.js';
import { Affiliation, Role } from '../value-objects/user-enums.js';
import { VerificationCode } from '../value-objects/verification-code.js';
import { Address, AddressData } from './address.js';

/** Estado completo del usuario. Lo usan `restore` y los adaptadores de persistencia. */
export interface UserProps {
  id: string;
  name: string;
  email: Email;
  passwordHash: string;
  affiliation: Affiliation;
  role: Role;
  phone: string | null;
  emailVerified: boolean;
  verificationCode: VerificationCode | null;
  addresses: Address[];
  createdAt: Date;
}

/** Datos necesarios para registrar a un miembro de la comunidad universitaria. */
export interface RegisterUserProps {
  id: string;
  name: string;
  email: Email;
  passwordHash: string;
  affiliation: Affiliation;
  verificationCode: VerificationCode;
  createdAt: Date;
}

/** Campos del perfil que el propio usuario puede modificar. */
export interface ProfileChanges {
  name?: string;
  /** `null` borra el teléfono; `undefined` lo deja como está. */
  phone?: string | null;
}

export class User {
  static readonly MAX_ADDRESSES = 5;

  private constructor(private readonly props: UserProps) {}

  /**
   * Registra un miembro nuevo de la comunidad: rol `CUSTOMER`, correo sin
   * verificar y con un código de verificación pendiente.
   * La regla del correo institucional la revisa antes el caso de uso con
   * `InstitutionalEmailPolicy`.
   *
   * @throws InvalidProfileDataError Si el nombre no es válido.
   */
  static register(data: RegisterUserProps): User {
    return new User({
      ...data,
      name: User.validateName(data.name),
      role: Role.CUSTOMER,
      phone: null,
      emailVerified: false,
      addresses: [],
    });
  }

  /**
   * Crea la cuenta administradora de la tienda. Nace verificada porque la
   * configura el equipo al desplegar, no se registra por el formulario.
   */
  static createAdmin(data: Omit<RegisterUserProps, 'verificationCode' | 'affiliation'>): User {
    return new User({
      ...data,
      name: User.validateName(data.name),
      affiliation: Affiliation.STAFF,
      role: Role.ADMIN,
      phone: null,
      emailVerified: true,
      verificationCode: null,
      addresses: [],
    });
  }

  /** Reconstruye un usuario desde la persistencia, sin volver a validarlo. */
  static restore(props: UserProps): User {
    return new User({ ...props, addresses: [...props.addresses] });
  }

  // ---------------------------------------------------------------------------
  // Lectura
  // ---------------------------------------------------------------------------

  get id(): string {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get email(): Email {
    return this.props.email;
  }
  get passwordHash(): string {
    return this.props.passwordHash;
  }
  get affiliation(): Affiliation {
    return this.props.affiliation;
  }
  get role(): Role {
    return this.props.role;
  }
  get phone(): string | null {
    return this.props.phone;
  }
  get emailVerified(): boolean {
    return this.props.emailVerified;
  }
  get verificationCode(): VerificationCode | null {
    return this.props.verificationCode;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  /** Copia de la lista de direcciones (modificarla no altera al usuario). */
  get addresses(): readonly Address[] {
    return [...this.props.addresses];
  }

  // ---------------------------------------------------------------------------
  // Verificación de correo y acceso
  // ---------------------------------------------------------------------------

  /**
   * Verifica el correo con el código que escribió el usuario.
   * Si el código no coincide, se cuenta el intento fallido en el usuario antes
   * de lanzar el error; el caso de uso debe guardar el usuario igualmente para
   * que el intento quede registrado.
   *
   * @param candidate Código escrito por el usuario.
   * @param now Momento actual (viene del puerto `Clock`).
   * @throws EmailAlreadyVerifiedError Si el correo ya estaba verificado.
   * @throws VerificationCodeExpiredError Si no hay código, venció o se agotaron los intentos.
   * @throws InvalidVerificationCodeError Si el código no coincide.
   */
  verifyEmail(candidate: string, now: Date): void {
    if (this.props.emailVerified) throw new EmailAlreadyVerifiedError();

    const current = this.props.verificationCode;
    if (!current || !current.isUsable(now)) throw new VerificationCodeExpiredError();

    if (!current.matches(candidate)) {
      const updated = current.withFailedAttempt();
      this.props.verificationCode = updated;
      throw new InvalidVerificationCodeError(updated.remainingAttempts);
    }

    this.props.emailVerified = true;
    this.props.verificationCode = null;
  }

  /**
   * Reemplaza el código pendiente por uno nuevo (al pedir un reenvío).
   *
   * @throws EmailAlreadyVerifiedError Si el correo ya estaba verificado.
   */
  renewVerificationCode(code: VerificationCode): void {
    if (this.props.emailVerified) throw new EmailAlreadyVerifiedError();
    this.props.verificationCode = code;
  }

  /**
   * Comprueba que el usuario pueda iniciar sesión. La contraseña la valida
   * antes el caso de uso, con el puerto `PasswordHasher`.
   *
   * @throws EmailNotVerifiedError Si el correo aún no se verificó.
   */
  ensureCanLogIn(): void {
    if (!this.props.emailVerified) throw new EmailNotVerifiedError();
  }

  // ---------------------------------------------------------------------------
  // Perfil
  // ---------------------------------------------------------------------------

  /**
   * Cambia el nombre y/o el teléfono. El correo y el rol no se pueden cambiar.
   *
   * @throws InvalidProfileDataError Si el nombre o el teléfono no son válidos.
   */
  updateProfile(changes: ProfileChanges): void {
    if (changes.name !== undefined) {
      this.props.name = User.validateName(changes.name);
    }
    if (changes.phone !== undefined) {
      this.props.phone = User.validatePhone(changes.phone);
    }
  }

  // ---------------------------------------------------------------------------
  // Direcciones
  // ---------------------------------------------------------------------------

  /**
   * Agrega una dirección. La primera queda como predeterminada automáticamente;
   * si se pide que la nueva sea predeterminada, las demás dejan de serlo.
   *
   * @param id Identificador generado por el puerto `IdGenerator`.
   * @param makeDefault Si la nueva dirección debe ser la predeterminada.
   * @returns La dirección creada.
   * @throws AddressLimitReachedError Si ya hay 5 direcciones.
   * @throws InvalidAddressError Si los datos no son válidos.
   */
  addAddress(id: string, data: AddressData, makeDefault = false): Address {
    if (this.props.addresses.length >= User.MAX_ADDRESSES) {
      throw new AddressLimitReachedError(User.MAX_ADDRESSES);
    }
    const isDefault = makeDefault || this.props.addresses.length === 0;
    const address = Address.create(id, data, isDefault);
    if (isDefault) this.clearDefaultAddress();
    this.props.addresses.push(address);
    return address;
  }

  /**
   * Edita una dirección y, si se indica, la convierte en predeterminada.
   * No se permite quitarle la marca de predeterminada directamente: para eso se
   * marca otra, así siempre queda una.
   *
   * @throws AddressNotFoundError Si el usuario no tiene esa dirección.
   * @throws InvalidAddressError Si los datos no son válidos.
   */
  updateAddress(addressId: string, changes: Partial<AddressData>, makeDefault = false): Address {
    const address = this.findAddress(addressId);
    address.update(changes);
    if (makeDefault && !address.isDefault) {
      this.clearDefaultAddress();
      address.setDefault(true);
    }
    return address;
  }

  /**
   * Elimina una dirección. Si era la predeterminada, la primera de las que
   * quedan pasa a serlo.
   *
   * @throws AddressNotFoundError Si el usuario no tiene esa dirección.
   */
  removeAddress(addressId: string): void {
    const address = this.findAddress(addressId);
    this.props.addresses = this.props.addresses.filter((a) => a.id !== addressId);
    if (address.isDefault && this.props.addresses.length > 0) {
      this.props.addresses[0].setDefault(true);
    }
  }

  // ---------------------------------------------------------------------------
  // Ayudantes privados
  // ---------------------------------------------------------------------------

  /** Busca una dirección del usuario o lanza `AddressNotFoundError`. */
  private findAddress(addressId: string): Address {
    const address = this.props.addresses.find((a) => a.id === addressId);
    if (!address) throw new AddressNotFoundError();
    return address;
  }

  /** Quita la marca de predeterminada a todas las direcciones. */
  private clearDefaultAddress(): void {
    this.props.addresses.forEach((a) => a.setDefault(false));
  }

  /** El nombre debe tener entre 2 y 100 caracteres sin contar espacios alrededor. */
  private static validateName(name: string): string {
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 100) {
      throw new InvalidProfileDataError('El nombre debe tener entre 2 y 100 caracteres.');
    }
    return trimmed;
  }

  /**
   * El teléfono es opcional; si se envía debe tener entre 7 y 15 dígitos y
   * puede empezar con "+". Se ignoran espacios y guiones.
   */
  private static validatePhone(phone: string | null): string | null {
    if (phone === null || phone.trim() === '') return null;
    const compact = phone.replace(/[\s-]/g, '');
    if (!/^\+?\d{7,15}$/.test(compact)) {
      throw new InvalidProfileDataError('El teléfono debe tener entre 7 y 15 dígitos.');
    }
    return compact;
  }
}
