/**
 * Infraestructura · Adaptadores de entrada HTTP de Pagos.
 *
 * - `InternalPaymentsController` (`/internal/payments`): lo usa el servicio de
 *   Pedidos dentro de la red de Docker para cobrar y reembolsar. El gateway no
 *   expone estas rutas.
 * - `PaymentsController` (`/payments`): el cliente consulta el pago de su pedido.
 */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  UnauthorizedException,
  Headers,
} from '@nestjs/common';
import { ApiConflictResponse, ApiNotFoundResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GET_PAYMENT, PROCESS_PAYMENT, REFUND_PAYMENT } from '../../application/ports/in/payment.ports.js';
import type { GetPaymentPort, ProcessPaymentPort, RefundPaymentPort } from '../../application/ports/in/payment.ports.js';
import { ChargeDto, PaymentResponseDto } from './dto/payments.dto.js';

@ApiTags('internal')
@Controller('internal/payments')
export class InternalPaymentsController {
  constructor(
    @Inject(PROCESS_PAYMENT) private readonly processPayment: ProcessPaymentPort,
    @Inject(REFUND_PAYMENT) private readonly refundPayment: RefundPaymentPort,
    @Inject(GET_PAYMENT) private readonly getPayment: GetPaymentPort,
  ) {}

  /**
   * Cobra un pedido. Responde 201 tanto si se aprueba como si se rechaza:
   * el resultado está en `status` y `reason`.
   */
  @Post()
  @ApiOperation({ summary: 'Cobrar un pedido' })
  @ApiResponse({ status: 201, type: PaymentResponseDto, description: 'Pago APPROVED o REJECTED' })
  charge(@Body() dto: ChargeDto): Promise<PaymentResponseDto> {
    return this.processPayment.execute(dto);
  }

  /** Reembolsa el pago aprobado del pedido. */
  @Post(':orderId/refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reembolsar el pago de un pedido' })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  @ApiConflictResponse({ description: 'El pago no está aprobado.' })
  refund(@Param('orderId') orderId: string): Promise<PaymentResponseDto> {
    return this.refundPayment.execute(orderId);
  }

  /** Consulta el pago de un pedido (para conciliar si una llamada de cobro se cortó). */
  @Get(':orderId')
  @ApiOperation({ summary: 'Consultar el pago de un pedido (interno)' })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  @ApiNotFoundResponse()
  get(@Param('orderId') orderId: string): Promise<PaymentResponseDto> {
    return this.getPayment.execute(orderId);
  }
}

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(@Inject(GET_PAYMENT) private readonly getPayment: GetPaymentPort) {}

  /** El cliente consulta el pago de su pedido (el admin, el de cualquiera). */
  @Get('orders/:orderId')
  @ApiOperation({ summary: 'Ver el pago de mi pedido' })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  @ApiNotFoundResponse()
  get(
    @Param('orderId') orderId: string,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-role') role?: string,
  ): Promise<PaymentResponseDto> {
    if (!userId) throw new UnauthorizedException('Debes iniciar sesión.');
    return this.getPayment.execute(orderId, { userId, isAdmin: role === 'ADMIN' });
  }
}
