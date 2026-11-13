/**
 * Aplicación · Vistas de salida.
 *
 * Forma en que los casos de uso devuelven usuarios y direcciones hacia fuera.
 * Son objetos planos: nunca exponen el hash de la contraseña ni el código de
 * verificación, y no dejan que el adaptador HTTP toque la entidad de dominio.
 */
import { Address } from '../../domain/entities/address.js';
import { User } from '../../domain/entities/user.js';
import { Affiliation, Role } from '../../domain/value-objects/user-enums.js';

/** Dirección tal como se devuelve al cliente. */
export interface AddressView {
  id: string;
  label: string;
  street: string;
  city: string;
  department: string;
  additionalInfo: string | null;
  isDefault: boolean;
}

/** Usuario tal como se devuelve al cliente (sin datos sensibles). */
export interface UserView {
  id: string;
  name: string;
  email: string;
  affiliation: Affiliation;
  role: Role;
  phone: string | null;
  emailVerified: boolean;
  addresses: AddressView[];
  createdAt: string;
}

/** Convierte una entidad `Address` en su vista. */
export function toAddressView(address: Address): AddressView {
  return address.toPrimitives();
}

/** Convierte una entidad `User` en su vista, omitiendo contraseña y código de verificación. */
export function toUserView(user: User): UserView {
  return {
    id: user.id,
    name: user.name,
    email: user.email.value,
    affiliation: user.affiliation,
    role: user.role,
    phone: user.phone,
    emailVerified: user.emailVerified,
    addresses: user.addresses.map(toAddressView),
    createdAt: user.createdAt.toISOString(),
  };
}
