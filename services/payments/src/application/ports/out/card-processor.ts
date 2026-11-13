/**
 * Aplicación · Puerto de salida `CardProcessor`.
 *
 * El banco o pasarela que autoriza los cobros. Hoy lo implementa un simulador
 * (`SimulatedCardProcessor`); para cobrar de verdad se escribiría otro
 * adaptador (Wompi, PayU...) sin tocar el dominio ni los casos de uso (OCP).
 */
import { Card } from '../../../domain/value-objects/card.js';

/** Token de inyección de dependencias para este puerto. */
export const CARD_PROCESSOR = Symbol('CardProcessor');

/** Respuesta de la autorización. */
export type AuthorizationResult = { approved: true; reference: string } | { approved: false; reason: string };

export interface CardProcessor {
  /**
   * Pide autorizar el cobro.
   * @param amount Monto en pesos.
   * @throws Error Si el procesador no responde.
   */
  authorize(card: Card, amount: number): Promise<AuthorizationResult>;

  /**
   * Devuelve el dinero de una transacción aprobada.
   * @throws Error Si el procesador no responde.
   */
  refund(reference: string, amount: number): Promise<void>;
}
