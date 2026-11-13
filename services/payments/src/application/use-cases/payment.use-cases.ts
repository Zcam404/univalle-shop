/**
 * Aplicación · Casos de uso de Pagos.
 */
import { Payment } from '../../domain/entities/payment.js';
import {
  CardProcessorUnavailableError,
  InvalidPaymentRequestError,
  PaymentNotFoundError,
} from '../../domain/errors/payment.errors.js';
import { Card } from '../../domain/value-objects/card.js';
import {
  GetPaymentPort,
  PaymentRequester,
  ProcessPaymentCommand,
  ProcessPaymentPort,
  RefundPaymentPort,
} from '../ports/in/payment.ports.js';
import { AuthorizationResult, CardProcessor } from '../ports/out/card-processor.js';
import { Clock } from '../ports/out/clock.js';
import { IdGenerator } from '../ports/out/id-generator.js';
import { PaymentRepository } from '../ports/out/payment.repository.js';
import { PaymentView, toPaymentView } from '../views/payment.view.js';

/**
 * Cobra un pedido.
 *
 * 1. Si el pedido ya tiene un pago, lo devuelve (idempotencia: un reintento de
 *    Pedidos no cobra dos veces).
 * 2. Valida la tarjeta; si no es válida, registra un pago REJECTED con el motivo.
 * 3. Pide la autorización al procesador y registra APPROVED o REJECTED.
 */
export class ProcessPaymentUseCase implements ProcessPaymentPort {
  /** Tope por transacción, como el cupo de una tarjeta de prueba. */
  static readonly MAX_AMOUNT = 20_000_000;

  constructor(
    private readonly payments: PaymentRepository,
    private readonly processor: CardProcessor,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  /**
   * @throws InvalidPaymentRequestError Si el monto o los ids no son válidos.
   * @throws CardProcessorUnavailableError Si el procesador no responde (no se registra pago).
   */
  async execute(command: ProcessPaymentCommand): Promise<PaymentView> {
    const existing = await this.payments.findByOrderId(command.orderId);
    if (existing) return toPaymentView(existing);

    if (!Number.isInteger(command.amount) || command.amount <= 0) {
      throw new InvalidPaymentRequestError('El monto debe ser un número entero de pesos mayor que cero.');
    }
    if (!command.orderId.trim() || !command.userId.trim()) {
      throw new InvalidPaymentRequestError('El pago necesita el id del pedido y del usuario.');
    }

    const now = this.clock.now();
    const validation = Card.validate(command.card, now);
    const base = {
      id: this.ids.generate(),
      orderId: command.orderId,
      userId: command.userId,
      amount: command.amount,
      createdAt: now,
    };

    let payment: Payment;
    if (!validation.ok) {
      payment = Payment.rejected({ ...base, cardBrand: null, cardLast4: validation.last4 }, validation.reason);
    } else {
      const card = validation.card;
      const cardData = { ...base, cardBrand: card.brand, cardLast4: card.last4 };
      const result = await this.authorize(card, command.amount);
      payment = result.approved
        ? Payment.approved(cardData, result.reference)
        : Payment.rejected(cardData, result.reason);
    }

    if (!(await this.payments.create(payment))) {
      // Otra petición del mismo pedido se adelantó: se devuelve la que quedó guardada.
      return toPaymentView((await this.payments.findByOrderId(command.orderId))!);
    }
    return toPaymentView(payment);
  }

  /** Autoriza con el procesador, aplicando antes el tope por transacción. */
  private async authorize(card: Card, amount: number): Promise<AuthorizationResult> {
    if (amount > ProcessPaymentUseCase.MAX_AMOUNT) {
      return { approved: false, reason: 'El monto supera el cupo disponible de la tarjeta.' };
    }
    try {
      return await this.processor.authorize(card, amount);
    } catch {
      throw new CardProcessorUnavailableError();
    }
  }
}

/** Reembolsa un pago aprobado. Si ya estaba reembolsado, lo devuelve sin repetir. */
export class RefundPaymentUseCase implements RefundPaymentPort {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly processor: CardProcessor,
    private readonly clock: Clock,
  ) {}

  /**
   * @throws PaymentNotFoundError Si el pedido no tiene pago.
   * @throws PaymentNotRefundableError Si el pago fue rechazado.
   * @throws CardProcessorUnavailableError Si el procesador no responde.
   */
  async execute(orderId: string): Promise<PaymentView> {
    const payment = await this.payments.findByOrderId(orderId);
    if (!payment) throw new PaymentNotFoundError();
    if (payment.status === 'REFUNDED') return toPaymentView(payment);

    payment.refund(this.clock.now()); // valida que esté APPROVED antes de llamar al procesador
    try {
      await this.processor.refund(payment.processorReference!, payment.toPrimitives().amount);
    } catch {
      throw new CardProcessorUnavailableError();
    }
    await this.payments.save(payment);
    return toPaymentView(payment);
  }
}

/** Consulta el pago de un pedido. Un cliente solo ve sus propios pagos. */
export class GetPaymentUseCase implements GetPaymentPort {
  constructor(private readonly payments: PaymentRepository) {}

  /** @throws PaymentNotFoundError Si no existe o es de otro usuario. */
  async execute(orderId: string, requester?: PaymentRequester): Promise<PaymentView> {
    const payment = await this.payments.findByOrderId(orderId);
    if (!payment) throw new PaymentNotFoundError();
    if (requester && !requester.isAdmin && payment.userId !== requester.userId) throw new PaymentNotFoundError();
    return toPaymentView(payment);
  }
}
