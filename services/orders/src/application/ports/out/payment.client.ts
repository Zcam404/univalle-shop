/**
 * Aplicación · Puerto de salida `PaymentClient`.
 *
 * Lo que Pedidos necesita del servicio de Pagos. Los datos de la tarjeta solo
 * pasan por aquí hacia Pagos; Pedidos nunca los guarda.
 */

/** Token de inyección de dependencias para este puerto. */
export const PAYMENT_CLIENT = Symbol('PaymentClient');

/** Datos de la tarjeta escritos por el cliente. */
export interface CardData {
  number: string;
  holderName: string;
  expMonth: number;
  expYear: number;
  cvv: string;
}

export interface ChargeRequest {
  /** Un cobro por pedido: repetirlo con el mismo id no cobra dos veces. */
  orderId: string;
  userId: string;
  /** Monto en pesos. */
  amount: number;
  card: CardData;
}

export interface ChargeResult {
  paymentId: string;
  status: 'APPROVED' | 'REJECTED';
  cardLast4: string | null;
  /** Motivo del rechazo, en español. */
  reason: string | null;
}

/** Pago registrado en el servicio de Pagos para un pedido. */
export interface PaymentRecordSummary {
  status: 'APPROVED' | 'REJECTED' | 'REFUNDED';
}

export interface PaymentClient {
  /**
   * Cobra el pedido. Un rechazo (fondos insuficientes, tarjeta inválida...) no
   * es una excepción: llega como `status: 'REJECTED'`.
   * @throws PaymentServiceUnavailableError Si Pagos no responde.
   */
  charge(request: ChargeRequest): Promise<ChargeResult>;

  /**
   * Reembolsa el pago aprobado de un pedido.
   * @throws PaymentServiceUnavailableError Si Pagos no responde.
   */
  refund(orderId: string): Promise<void>;

  /**
   * Consulta si hay un pago registrado para el pedido (para conciliar).
   * @returns El pago, o `null` si nunca se registró ninguno.
   * @throws PaymentServiceUnavailableError Si Pagos no responde.
   */
  findByOrder(orderId: string): Promise<PaymentRecordSummary | null>;
}
