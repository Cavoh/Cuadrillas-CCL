import React from 'react';
import { OrderData } from '../types';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { Search, Filter } from 'lucide-react';

interface OrdersTableProps {
  data: OrderData[];
}

export default function OrdersTable({ data }: OrdersTableProps) {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredData = data.filter(item => 
    item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.transportadora.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Órdenes de Cargue</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar orden o transportadora..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white sm:w-64"
            />
          </div>
          <button className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700">
            <Filter className="h-4 w-4" />
            <span>Filtros</span>
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/50">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">ID Orden</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Fecha de Cargue</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Cuadrilla</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Transportadora</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Cajas</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Hora de Inicio</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Hora de Finalización</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Tiempo (min)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    No hay datos cargados. Use la configuración para subir un archivo Excel.
                  </td>
                </tr>
              ) : (
                filteredData.map((row, i) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={row.id + i}
                    className={cn(
                      "transition-colors",
                      row.cuadrilla === 'SLA' 
                        ? "bg-red-50/50 hover:bg-red-100/50 dark:bg-red-900/10 dark:hover:bg-red-900/20" 
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    )}
                  >
                    <td className={cn(
                      "px-6 py-4 font-mono text-sm font-medium",
                      row.cuadrilla === 'SLA' ? "text-red-700 dark:text-red-400" : "text-slate-900 dark:text-white"
                    )}>{row.id}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                      {format(row.fechaInicio, 'dd/MM/yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset",
                        row.cuadrilla === 'SLA' 
                          ? "bg-red-100 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-400" 
                          : "bg-blue-100 text-blue-700 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-400"
                      )}>
                        {row.cuadrilla}
                      </span>
                    </td>
                    <td className={cn(
                      "px-6 py-4 text-sm font-medium",
                      row.cuadrilla === 'SLA' ? "text-red-900 dark:text-red-200" : "text-slate-600 dark:text-slate-400"
                    )}>{row.transportadora}</td>
                    <td className={cn(
                      "px-6 py-4 text-sm font-bold",
                      row.cuadrilla === 'SLA' ? "text-red-700 dark:text-red-400" : "text-slate-900 dark:text-white"
                    )}>{row.cajas}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{format(row.fechaInicio, 'HH:mm')}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{format(row.fechaFin, 'HH:mm')}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">{row.loadingTimeMinutes}</td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
