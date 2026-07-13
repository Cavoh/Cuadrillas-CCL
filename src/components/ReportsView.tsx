import React from 'react';
import { OrderData, AppConfig } from '../types';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { cn } from '../lib/utils';
import { TrendingUp, Clock, Package, DollarSign } from 'lucide-react';

interface ReportsViewProps {
  data: OrderData[];
  config: AppConfig;
}

export default function ReportsView({ data, config }: ReportsViewProps) {
  const [dateRange, setDateRange] = React.useState<{start: string, end: string}>({
    start: '',
    end: '',
  });

  // Sync date range when data is first loaded or changes
  React.useEffect(() => {
    if (data.length > 0 && (!dateRange.start || !dateRange.end)) {
      const sorted = [...data].sort((a, b) => a.fechaInicio.getTime() - b.fechaInicio.getTime());
      setDateRange({
        start: format(sorted[0].fechaInicio, 'yyyy-MM-dd'),
        end: format(sorted[sorted.length - 1].fechaFin, 'yyyy-MM-dd'),
      });
    }
  }, [data]);

  const filteredData = React.useMemo(() => {
    if (!dateRange.start || !dateRange.end) return data;
    
    // Create Date objects correctly without time zone shifts
    const [startYear, startMonth, startDay] = dateRange.start.split('-').map(Number);
    const [endYear, endMonth, endDay] = dateRange.end.split('-').map(Number);
    
    const start = startOfDay(new Date(startYear, startMonth - 1, startDay));
    const end = endOfDay(new Date(endYear, endMonth - 1, endDay));
    
    return data.filter(d => {
      const date = d.fechaInicio;
      return date >= start && date <= end;
    });
  }, [data, dateRange]);

  // Data for Pie Chart: Boxes per crew
  const pieData = React.useMemo(() => {
    const sla = filteredData.filter(d => d.cuadrilla === 'SLA').reduce((acc, d) => acc + d.cajas, 0);
    const ccl = filteredData.filter(d => d.cuadrilla === 'CCL').reduce((acc, d) => acc + d.cajas, 0);
    
    if (sla === 0 && ccl === 0) {
      return [
        { name: 'SLA (Sin datos)', value: 1, color: '#f1f5f9' },
        { name: 'CCL (Sin datos)', value: 1, color: '#e2e8f0' },
      ];
    }

    return [
      { name: 'SLA', value: sla, color: '#ef4444' }, // Red for SLA
      { name: 'CCL', value: ccl, color: '#3b82f6' }, // Blue for CCL
    ];
  }, [filteredData]);

  // Data for Bar Chart: Times/Delays by carrier
  const carrierData = React.useMemo(() => {
    const carriers: Record<string, { name: string, tiempo: number, retraso: number, count: number }> = {};
    filteredData.forEach(d => {
      if (!carriers[d.transportadora]) carriers[d.transportadora] = { name: d.transportadora, tiempo: 0, retraso: 0, count: 0 };
      carriers[d.transportadora].tiempo += d.loadingTimeMinutes;
      carriers[d.transportadora].retraso += d.delayDays;
      carriers[d.transportadora].count += 1;
    });
    return Object.values(carriers).map(c => ({
      ...c,
      tiempoPromedio: Math.round(c.tiempo / c.count),
      retrasoTotal: c.retraso
    }));
  }, [filteredData]);

  // Average loading time by crew
  const crewAvgTimeData = React.useMemo(() => {
    const sla = filteredData.filter(d => d.cuadrilla === 'SLA');
    const ccl = filteredData.filter(d => d.cuadrilla === 'CCL');
    const slaAvg = sla.length > 0 ? sla.reduce((acc, d) => acc + d.loadingTimeMinutes, 0) / sla.length : 0;
    const cclAvg = ccl.length > 0 ? ccl.reduce((acc, d) => acc + d.loadingTimeMinutes, 0) / ccl.length : 0;
    
    return [
      { name: 'SLA', avg: Math.round(slaAvg) || 0 },
      { name: 'CCL', avg: Math.round(cclAvg) || 0 },
    ];
  }, [filteredData]);

  // Summary costs
  const costs = React.useMemo(() => {
    const slaBoxes = filteredData.filter(d => d.cuadrilla === 'SLA').reduce((acc, d) => acc + d.cajas, 0);
    const cclDays = new Set(filteredData.filter(d => d.cuadrilla === 'CCL').map(d => format(d.fechaInicio, 'yyyy-MM-dd'))).size;
    
    return {
      sla: slaBoxes * config.slaBoxValue,
      ccl: cclDays * config.cclDailyValue,
      total: (slaBoxes * config.slaBoxValue) + (cclDays * config.cclDailyValue)
    };
  }, [filteredData, config]);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Informes Detallados</h1>
        <div className="flex items-center gap-2 rounded-xl bg-white p-1 shadow-sm dark:bg-slate-900">
          <input 
            type="date" 
            value={dateRange.start}
            onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
            className="rounded-lg bg-transparent px-3 py-1.5 text-sm outline-none dark:text-white"
          />
          <span className="text-slate-400">→</span>
          <input 
            type="date" 
            value={dateRange.end}
            onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
            className="rounded-lg bg-transparent px-3 py-1.5 text-sm outline-none dark:text-white"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Cajas', value: filteredData.reduce((acc, d) => acc + d.cajas, 0), icon: Package, color: 'text-blue-600' },
          { label: 'Tiempo Promedio', value: `${Math.round(filteredData.reduce((acc, d) => acc + d.loadingTimeMinutes, 0) / (filteredData.length || 1))} min`, icon: Clock, color: 'text-purple-600' },
          { label: 'Costo SLA', value: `$${costs.sla.toLocaleString()}`, icon: DollarSign, color: 'text-red-600' },
          { label: 'Costo CCL', value: `$${costs.ccl.toLocaleString()}`, icon: DollarSign, color: 'text-green-600' },
        ].map((kpi, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{kpi.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{kpi.value}</p>
              </div>
              <div className={cn("rounded-xl bg-slate-50 p-3 dark:bg-slate-800", kpi.color)}>
                <kpi.icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Pie Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-6 font-semibold text-slate-800 dark:text-white">Cantidad de Cajas por Cuadrilla</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Loading Average Bar Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-6 font-semibold text-slate-800 dark:text-white">Promedio de Cargue (Minutos)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={crewAvgTimeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                  {crewAvgTimeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === 'SLA' ? '#ef4444' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Carrier Performance */}
        <div className="col-span-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <h3 className="mb-6 font-semibold text-slate-800 dark:text-white">Tiempos y Retrasos por Transportadora</h3>
          <div className="h-80">
            {carrierData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={carrierData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                  <YAxis yAxisId="right" orientation="right" stroke="#ef4444" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="tiempoPromedio" name="Tiempo Promedio (min)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="retrasoTotal" name="Días Retraso Total" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400">
                No hay datos de transportadoras en este rango
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-6 font-semibold text-slate-800 dark:text-white">Resumen de Costos por Operación</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="pb-4 text-xs font-semibold uppercase text-slate-500">Cuadrilla</th>
                <th className="pb-4 text-xs font-semibold uppercase text-slate-500">Métrica (Cajas/Días)</th>
                <th className="pb-4 text-xs font-semibold uppercase text-slate-500">Valor Unitario</th>
                <th className="pb-4 text-xs font-semibold uppercase text-slate-500">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <tr className="group">
                <td className="py-4 font-semibold text-red-600">SLA (Pago x Caja)</td>
                <td className="py-4 text-slate-600 dark:text-slate-400">{filteredData.filter(d => d.cuadrilla === 'SLA').reduce((acc, d) => acc + d.cajas, 0)} Cajas</td>
                <td className="py-4 text-slate-600 dark:text-slate-400">${config.slaBoxValue.toLocaleString()} / caja</td>
                <td className="py-4 font-bold text-slate-900 dark:text-white">${costs.sla.toLocaleString()}</td>
              </tr>
              <tr className="group">
                <td className="py-4 font-semibold text-blue-600">CCL (Pago Diario)</td>
                <td className="py-4 text-slate-600 dark:text-slate-400">{new Set(filteredData.filter(d => d.cuadrilla === 'CCL').map(d => format(d.fechaInicio, 'yyyy-MM-dd'))).size} Días</td>
                <td className="py-4 text-slate-600 dark:text-slate-400">${config.cclDailyValue.toLocaleString()} / día</td>
                <td className="py-4 font-bold text-slate-900 dark:text-white">${costs.ccl.toLocaleString()}</td>
              </tr>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                <td colSpan={3} className="py-4 pl-4 font-bold text-slate-900 dark:text-white text-right pr-12">TOTAL GENERAL OPERATIVO</td>
                <td className="py-4 font-black text-blue-600 text-lg">${costs.total.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
