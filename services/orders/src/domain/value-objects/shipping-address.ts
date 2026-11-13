/**
 * Dominio · Value object `ShippingAddress`.
 *
 * Dirección a la que se envía un pedido. Se guarda una copia dentro del
 * pedido: si el usuario después edita o borra su dirección en el servicio de
 * Usuarios, el pedido conserva a dónde se envió.
 */
import { InvalidShippingAddressError } from '../errors/order.errors.js';

export interface ShippingAddressProps {
  recipientName: string;
  street: string;
  city: string;
  department: string;
  phone: string;
  additionalInfo: string | null;
}

export class ShippingAddress {
  private constructor(private readonly props: ShippingAddressProps) {}

  /**
   * Valida y limpia la dirección.
   * @throws InvalidShippingAddressError Si falta un campo obligatorio o el teléfono no es válido.
   */
  static create(data: Omit<ShippingAddressProps, 'additionalInfo'> & { additionalInfo?: string | null }): ShippingAddress {
    const clean: Record<string, string> = {};
    for (const field of ['recipientName', 'street', 'city', 'department'] as const) {
      const value = (data[field] ?? '').trim();
      if (!value) throw new InvalidShippingAddressError(`El campo "${field}" de la dirección de envío es obligatorio.`);
      if (value.length > 120) throw new InvalidShippingAddressError(`El campo "${field}" es demasiado largo.`);
      clean[field] = value;
    }
    const phone = (data.phone ?? '').replace(/[\s-]/g, '');
    if (!/^\+?\d{7,15}$/.test(phone)) {
      throw new InvalidShippingAddressError('El teléfono de contacto debe tener entre 7 y 15 dígitos.');
    }
    const additionalInfo = data.additionalInfo?.trim() || null;
    if (additionalInfo && additionalInfo.length > 250) {
      throw new InvalidShippingAddressError('Las indicaciones adicionales son demasiado largas.');
    }
    return new ShippingAddress({
      recipientName: clean.recipientName,
      street: clean.street,
      city: clean.city,
      department: clean.department,
      phone,
      additionalInfo,
    });
  }

  /** Reconstruye la dirección desde la persistencia. */
  static restore(props: ShippingAddressProps): ShippingAddress {
    return new ShippingAddress({ ...props });
  }

  toPrimitives(): ShippingAddressProps {
    return { ...this.props };
  }
}
