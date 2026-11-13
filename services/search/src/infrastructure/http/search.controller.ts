/**
 * Infraestructura · Adaptadores de entrada HTTP de Búsqueda.
 *
 * - `SearchController` (`/search`): búsqueda pública, sugerencias e historial.
 * - `AdminSearchController` (`/admin`): estado del índice y reindexado (admin).
 * - `InternalSearchController` (`/internal`): búsquedas recientes para Recomendación.
 *
 * La identidad llega del API Gateway en `x-user-id` / `x-user-role`. En las
 * rutas públicas el gateway también la reenvía si el usuario inició sesión,
 * y así se puede guardar su historial de búsquedas.
 */
import {
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CLEAR_RECENT_SEARCHES,
  GET_RECENT_SEARCHES,
  GET_SYNC_STATUS,
  REINDEX_CATALOG,
  SEARCH_PRODUCTS,
  SUGGEST_PRODUCTS,
} from '../../application/ports/in/search.ports.js';
import type {
  ClearRecentSearchesPort,
  GetRecentSearchesPort,
  GetSyncStatusPort,
  ReindexCatalogPort,
  SearchProductsPort,
  SuggestProductsPort,
} from '../../application/ports/in/search.ports.js';
import { RecentSearchDto, SearchQueryDto, SearchResultDto, SyncStatusDto } from './dto/search.dto.js';

/** Devuelve el id del usuario o responde 401. */
function requireUser(userId: string | undefined): string {
  if (!userId) throw new UnauthorizedException('Debes iniciar sesión.');
  return userId;
}

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(
    @Inject(SEARCH_PRODUCTS) private readonly searchProducts: SearchProductsPort,
    @Inject(SUGGEST_PRODUCTS) private readonly suggestProducts: SuggestProductsPort,
    @Inject(GET_RECENT_SEARCHES) private readonly getRecent: GetRecentSearchesPort,
    @Inject(CLEAR_RECENT_SEARCHES) private readonly clearRecent: ClearRecentSearchesPort,
  ) {}

  /** Busca productos por texto y filtros. */
  @Get()
  @ApiOperation({ summary: 'Buscar productos' })
  @ApiResponse({ status: 200, type: SearchResultDto })
  search(@Query() dto: SearchQueryDto, @Headers('x-user-id') userId?: string): Promise<SearchResultDto> {
    return this.searchProducts.execute(
      {
        text: dto.q,
        categoryId: dto.categoryId,
        minPrice: dto.minPrice,
        maxPrice: dto.maxPrice,
        onlyAvailable: dto.available,
        sort: dto.sort,
        page: dto.page,
        pageSize: dto.pageSize,
      },
      userId || undefined,
    );
  }

  /** Nombres sugeridos mientras el usuario escribe. */
  @Get('suggestions')
  @ApiOperation({ summary: 'Sugerencias para autocompletar' })
  @ApiQuery({ name: 'q', example: 'cuad' })
  @ApiResponse({ status: 200, type: [String] })
  suggestions(@Query('q') q = ''): Promise<string[]> {
    return this.suggestProducts.execute(String(q).slice(0, 100));
  }

  /** Mis búsquedas recientes. */
  @Get('recent')
  @ApiOperation({ summary: 'Mis búsquedas recientes' })
  @ApiHeader({ name: 'x-user-id', required: true })
  @ApiResponse({ status: 200, type: [RecentSearchDto] })
  recent(@Headers('x-user-id') userId?: string): Promise<RecentSearchDto[]> {
    return this.getRecent.execute(requireUser(userId));
  }

  /** Borrar mi historial de búsquedas. */
  @Delete('recent')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Borrar mis búsquedas recientes' })
  async clear(@Headers('x-user-id') userId?: string): Promise<void> {
    await this.clearRecent.execute(requireUser(userId));
  }
}

@ApiTags('admin')
@Controller('admin')
export class AdminSearchController {
  constructor(
    @Inject(GET_SYNC_STATUS) private readonly status: GetSyncStatusPort,
    @Inject(REINDEX_CATALOG) private readonly reindex: ReindexCatalogPort,
  ) {}

  /** Cuántos productos hay en el índice y cuándo se sincronizó por última vez. */
  @Get('status')
  @ApiOperation({ summary: 'Estado del índice (admin)' })
  @ApiResponse({ status: 200, type: SyncStatusDto })
  getStatus(@Headers('x-user-role') role?: string): Promise<SyncStatusDto> {
    AdminSearchController.requireAdmin(role);
    return this.status.execute();
  }

  /** Relee todo el catálogo desde el principio. */
  @Post('reindex')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reconstruir el índice (admin)' })
  async rebuild(@Headers('x-user-role') role?: string): Promise<{ reindexed: number }> {
    AdminSearchController.requireAdmin(role);
    return { reindexed: await this.reindex.execute() };
  }

  /** Defensa en profundidad: el gateway ya lo exige, pero el servicio también lo revisa. */
  private static requireAdmin(role: string | undefined): void {
    if (role !== 'ADMIN') throw new ForbiddenException('Solo un administrador puede realizar esta acción.');
  }
}

@ApiTags('internal')
@Controller('internal')
export class InternalSearchController {
  constructor(@Inject(GET_RECENT_SEARCHES) private readonly getRecent: GetRecentSearchesPort) {}

  /** Búsquedas recientes de un usuario (para el servicio de Recomendación). */
  @Get('users/:userId/recent-searches')
  @ApiOperation({ summary: 'Búsquedas recientes de un usuario (interno)' })
  @ApiResponse({ status: 200, type: [RecentSearchDto] })
  recent(@Param('userId') userId: string): Promise<RecentSearchDto[]> {
    return this.getRecent.execute(userId);
  }
}
