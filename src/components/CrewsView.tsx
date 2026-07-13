import React from 'react';
import { OrderData } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { Users, AlertCircle, CheckCircle2 } from 'lucide-react';

interface CrewsViewProps {
  data: OrderData[];
}

export default function CrewsView({ data }: CrewsViewProps) {
  const slaData = data.filter(d => d.cuadrilla === 'SLA');
  const cclData = data.filter(d => d.cuadrilla === 'CCL');

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Estado de Cuadrillas</h1>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* SLA Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-red-600">
            <Users className="h-6 w-6" />
            <h2 className="text-xl font-bold">Cuadrilla SLA</h2>
          </div>
          <div className="rounded-2xl border-2 border-red-100 bg-red-50/30 p-6 dark:border-red-900/20 dark:bg-red-900/5">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-600">
                <AlertCircle className="h-3 w-3" />
                CRÍTICO / PRIORIDAD
              </div>
              <span className="text-2xl font-black text-red-600">{slaData.length} Órdenes</span>
            </div>
            
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Esta sección muestra el desempeño de la cuadrilla externa bajo el modelo de pago por caja (SLA).
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
                <p className="text-xs text-slate-500 uppercase">Total Cajas</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{slaData.reduce((acc, d) => acc + d.cajas, 0)}</p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
                <p className="text-xs text-slate-500 uppercase">Eficiencia</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {Math.round(slaData.reduce((acc, d) => acc + d.cajas, 0) / (slaData.length || 1))} c/orden
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CCL Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-blue-600">
            <Users className="h-6 w-6" />
            <h2 className="text-xl font-bold">Cuadrilla CCL</h2>
          </div>
          <div className="rounded-2xl border-2 border-blue-100 bg-blue-50/30 p-6 dark:border-blue-900/20 dark:bg-blue-900/5">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-600">
                <CheckCircle2 className="h-3 w-3" />
                INTERNO / ESTÁNDAR
              </div>
              <span className="text-2xl font-black text-blue-600">{cclData.length} Órdenes</span>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Monitoreo de la cuadrilla interna de CCL. Operaciones basadas en valor diario fijo.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
                <p className="text-xs text-slate-500 uppercase">Total Cajas</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{cclData.reduce((acc, d) => acc + d.cajas, 0)}</p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
                <p className="text-xs text-slate-500 uppercase">Días Operados</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {new Set(cclData.map(d => d.fechaInicio.toDateString())).size}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
