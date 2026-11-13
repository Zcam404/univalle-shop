/**
 * Dominio · Entidad `Address`.
 *
 * Dirección de envío de un usuario. Siempre se maneja a través del agregado
 * `User`, que es quien decide cuál es la predeterminada y cuántas puede haber.
 */
import { InvalidAddressError } from '../errors/user.errors.js';

/** Datos que el usuario escribe al crear o editar una dirección. */
export interface AddressData {
  /** Nombre corto para reconocerla (ej. "Casa", "Oficina"). */
  label: string;
  street: string;
  city: string;
  department: string;
  /** Indicaciones adicionales (barrio, apartamento, referencias). Opcional. */
  additionalInfo?: string | null;
}

/** Estado completo de una dirección, incluido su identificador. */
export interface AddressProps extends Required<AddressData> {
  id: string;
  isDefault: boolean;
}

export class Address {
  private constructor(private props: AddressProps) {}

  /**
   * Crea una dirección nueva validando sus campos.
   *
   * @param id Identificador único generado por el puerto `IdGenerator`.
   * @param data Datos escritos por el usuario.
   * @param isDefault Si debe quedar como dirección predeterminada.
   * @throws InvalidAddressError Si falta algún campo obligatorio o es demasiado largo.
   */
  static create(id: string, data: AddressData, isDefault: boolean): Address {
    return new Address({ id, ...Address.validate(data), isDefault });
  }

  /** Reconstruye una dirección desde la persistencia, sin volver a validarla. */
  static restore(props: AddressProps): Address {
    return new Address({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get isDefault(): boolean {
    return this.props.isDefault;
  }

  /**
   * Reemplaza los campos indicados y valida el resultado completo.
   *
   * @param changes Campos que cambian; los que no vienen se conservan.
   * @throws InvalidAddressError Si el resultado no es una dirección válida.
   */
  update(changes: Partial<AddressData>): void {
    const merged = { ...this.props, ...Address.dropUndefined(changes) };
    this.props = { ...merged, ...Address.validate(merged) };
  }

  /** Marca o desmarca la dirección como predeterminada (lo decide el agregado `User`). */
  setDefault(isDefault: boolean): void {
    this.props.isDefault = isDefault;
  }

  /** Copia plana de los datos, para persistencia y para respuestas. */
  toPrimitives(): AddressProps {
    return { ...this.props };
  }

  /**
   * Limpia y valida los campos de texto.
   * Los obligatorios no pueden quedar vacíos y ninguno puede superar los 120 caracteres.
   */
  private static validate(data: AddressData): Required<AddressData> {
    const required = { label: data.label, street: data.street, city: data.city, department: data.department };
    const clean: Record<string, string> = {};
    for (const [field, value] of Object.entries(required)) {
      const trimmed = (value ?? '').trim();
      if (!trimmed) throw new InvalidAddressError(`El campo "${field}" de la dirección es obligatorio.`);
      if (trimmed.length > 120) throw new InvalidAddressError(`El campo "${field}" es demasiado largo.`);
      clean[field] = trimmed;
    }
    const additionalInfo = data.additionalInfo?.trim() || null;
    if (additionalInfo && additionalInfo.length > 250) {
      throw new InvalidAddressError('Las indicaciones adicionales son demasiado largas.');
    }
    return {
      label: clean.label,
      street: clean.street,
      city: clean.city,
      department: clean.department,
      additionalInfo,
    };
  }

  /** Quita las claves con valor `undefined` para que no borren datos al combinar objetos. */
  private static dropUndefined<T extends object>(obj: T): Partial<T> {
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
  }
}
