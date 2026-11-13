/**
 * Infraestructura · Adaptador de entrada HTTP: rutas internas.
 *
 * Las usan otros microservicios dentro de la red de Docker, nunca el
 * navegador: el API Gateway no tiene ninguna ruta hacia `/internal`.
 * - Pedidos: reservar, confirmar y liberar stock.
 * - Búsqueda: feed de productos modificados.
 */
import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, Post, Query } from '@nestjs/common';
import { ApiConflictResponse, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LIST_PRODUCT_CHANGES } from '../../application/ports/in/product.ports.js';
import type { ListProductChangesPort } from '../../application/ports/in/product.ports.js';
import {
  CONFIRM_RESERVATION,
  RELEASE_RESERVATION,
  RESERVE_STOCK,
} from '../../application/ports/in/reservation.ports.js';
import type {
  ConfirmReservationPort,
  ReleaseReservationPort,
  ReserveStockPort,
} from '../../application/ports/in/reservation.ports.js';
import { ProductChangesResponseDto, ReservationResponseDto, ReserveStockDto } from './dto/catalog.dto.js';

@ApiTags('internal')
@Controller('internal')
export class InternalController {
  constructor(
    @Inject(RESERVE_STOCK) private readonly reserveStock: ReserveStockPort,
    @Inject(CONFIRM_RESERVATION) private readonly confirmReservation: ConfirmReservationPort,
    @Inject(RELEASE_RESERVATION) private readonly releaseReservation: ReleaseReservationPort,
    @Inject(LIST_PRODUCT_CHANGES) private readonly listChanges: ListProductChangesPort,
  ) {}

  /** Aparta stock para un pedido (todo o nada). Repetirla con el mismo pedido no descuenta dos veces. */
  @Post('reservations')
  @ApiOperation({ summary: 'Reservar stock para un pedido' })
  @ApiResponse({ status: 201, type: ReservationResponseDto })
  @ApiConflictResponse({ description: 'Stock insuficiente o producto no disponible.' })
  reserve(@Body() dto: ReserveStockDto): Promise<ReservationResponseDto> {
    return this.reserveStock.execute(dto);
  }

  /** Confirma la reserva (pedido pagado). */
  @Post('reservations/:orderId/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmar reserva' })
  @ApiResponse({ status: 200, type: ReservationResponseDto })
  confirm(@Param('orderId') orderId: string): Promise<ReservationResponseDto> {
    return this.confirmReservation.execute(orderId);
  }

  /** Libera la reserva y devuelve el stock (pago fallido o pedido cancelado). */
  @Post('reservations/:orderId/release')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liberar reserva' })
  @ApiResponse({ status: 200, type: ReservationResponseDto })
  release(@Param('orderId') orderId: string): Promise<ReservationResponseDto> {
    return this.releaseReservation.execute(orderId);
  }

  /** Productos modificados después del cursor (para el servicio de Búsqueda). */
  @Get('products/changes')
  @ApiOperation({ summary: 'Feed de productos modificados' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: ProductChangesResponseDto })
  changes(@Query('cursor') cursor?: string, @Query('limit') limit?: string): Promise<ProductChangesResponseDto> {
    return this.listChanges.execute(cursor || undefined, limit ? Number(limit) || undefined : undefined);
  }
}
