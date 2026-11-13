/**
 * Infraestructura · Adaptador de entrada HTTP de Recomendación.
 *
 * - `GET /recommendations/me`: personalizadas (exige sesión; la identidad llega del gateway).
 * - `GET /recommendations/popular`: más vendidos (público).
 * - `GET /recommendations/products/:id/related`: relacionados (público).
 */
import { Controller, Get, Headers, Inject, Param, Query, UnauthorizedException } from '@nestjs/common';
import { ApiHeader, ApiNotFoundResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { GET_MY_RECOMMENDATIONS, GET_POPULAR, GET_RELATED } from '../../application/ports/in/recommendation.ports.js';
import type { GetMyRecommendationsPort, GetPopularPort, GetRelatedPort } from '../../application/ports/in/recommendation.ports.js';
import type { RecommendationListView } from '../../application/views/recommendation.views.js';

/** Convierte el parámetro `limit` de la URL en número (o `undefined`). */
const toLimit = (limit?: string) => (limit ? Number(limit) || undefined : undefined);

@ApiTags('recommendations')
@Controller('recommendations')
export class RecommendationsController {
  constructor(
    @Inject(GET_MY_RECOMMENDATIONS) private readonly mine: GetMyRecommendationsPort,
    @Inject(GET_POPULAR) private readonly popular: GetPopularPort,
    @Inject(GET_RELATED) private readonly related: GetRelatedPort,
  ) {}

  /** Recomendaciones para el usuario autenticado. */
  @Get('me')
  @ApiOperation({ summary: 'Mis recomendaciones' })
  @ApiHeader({ name: 'x-user-id', required: true })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  forMe(@Headers('x-user-id') userId?: string, @Query('limit') limit?: string): Promise<RecommendationListView> {
    if (!userId) throw new UnauthorizedException('Debes iniciar sesión.');
    return this.mine.execute(userId, toLimit(limit));
  }

  /** Más vendidos de la tienda. */
  @Get('popular')
  @ApiOperation({ summary: 'Productos populares' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getPopular(@Query('limit') limit?: string): Promise<RecommendationListView> {
    return this.popular.execute(toLimit(limit));
  }

  /** Productos relacionados con uno. */
  @Get('products/:productId/related')
  @ApiOperation({ summary: 'Productos relacionados' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiNotFoundResponse()
  getRelated(@Param('productId') productId: string, @Query('limit') limit?: string): Promise<RecommendationListView> {
    return this.related.execute(productId, toLimit(limit));
  }
}
