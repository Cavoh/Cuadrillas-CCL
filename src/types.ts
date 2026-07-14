/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CrewType = 'CCL' | 'SLA' | 'LTSA';

export interface OrderData {
  id: string;
  cuadrilla: CrewType;
  cajas: number;
  transportadora: string;
  fechaInicio: Date;
  fechaFin: Date;
  fechaProgramada?: Date;
  loadingTimeMinutes: number;
  delayDays: number;
}

export interface AppConfig {
  slaBoxValue: number;
  cclDailyValue: number;
  theme: 'light' | 'dark';
}

export interface RawOrderRow {
  [key: string]: any;
}
