import React from 'react';
import { OrderData, AppConfig } from '../types';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';
import { format, isWithinInterval, startOfDay, endOfDay, differenceInDays } from 'date-fns';
import { cn } from '../lib/utils';
import { TrendingUp, Clock, Package, DollarSign, Truck } from 'lucide-react';

// Escala semafórica para transportadoras ordenadas de mayor a menor retraso
// Rojo (peor) → Naranja → Ámbar → Verde azulado (mejor)
const SEMAPHORE_COLORS = [
  '#dc2626', // rojo — mayor retraso
  '#ea580c', // naranja oscuro
  '#f97316', // naranja
  '#fb923c', // naranja claro
  '#f59e0b', // ámbar
  '#eab308', // amarillo
  '#84cc16', // verde lima
  '#22c55e', // verde
  '#10b981', // esmeralda
  '#0d9488', // teal — menor retraso
];

// Interpolación: si hay más transportadoras que colores, se cicla hacia el centro
const getCarrierColor = (index: number, total: number): string => {
  if (total <= 1) return SEMAPHORE_COLORS[0];
  const ratio = index / Math.max(total - 1, 1);
  const colorIndex = Math.round(ratio * (SEMAPHORE_COLORS.length - 1));
  return SEMAPHORE_COLORS[colorIndex];
};

interface ReportsViewProps {
  data: OrderData[];
  config: AppConfig;
}

export default function ReportsView({ data, config }: ReportsViewProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [dateRange, setDateRange] = React.useState<{start: string, end: string}>({
    start: today,
    end: today,
  });

  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const dataRangeStr = React.useMemo(() => {
    if (data.length === 0) return 'Sin datos';
    const dates = data.map(d => new Date(d.fechaInicio).getTime());
    const min = new Date(Math.min(...dates));
    const max = new Date(Math.max(...dates));
    return `${format(min, 'dd/MM/yyyy')} - ${format(max, 'dd/MM/yyyy')}`;
  }, [data]);

  const filteredData = React.useMemo(() => {
    if (!dateRange.start || !dateRange.end) return data;
    
    const [startYear, startMonth, startDay] = dateRange.start.split('-').map(Number);
    const [endYear, endMonth, endDay] = dateRange.end.split('-').map(Number);
    
    const start = startOfDay(new Date(startYear, startMonth - 1, startDay));
    const end = endOfDay(new Date(endYear, endMonth - 1, endDay));
    
    return data.filter(d => {
      const date = new Date(d.fechaInicio);
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

  const carrierData = React.useMemo(() => {
    const carriers: Record<string, { name: string, aTiempo: number, retrasoTotal: number, retrasados: number }> = {};
    filteredData.forEach(d => {
      if (!carriers[d.transportadora]) carriers[d.transportadora] = { name: d.transportadora, aTiempo: 0, retrasoTotal: 0, retrasados: 0 };
      
      if (d.delayDays === 0) {
        carriers[d.transportadora].aTiempo += 1;
      } else {
        carriers[d.transportadora].retrasados += 1;
      }
      carriers[d.transportadora].retrasoTotal += d.delayDays;
    });
    return Object.values(carriers).sort((a, b) => b.retrasoTotal - a.retrasoTotal);
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
    
    // CCL is based strictly on the selected date range
    const [startYear, startMonth, startDay] = (dateRange.start || today).split('-').map(Number);
    const [endYear, endMonth, endDay] = (dateRange.end || today).split('-').map(Number);
    const startDate = new Date(startYear, startMonth - 1, startDay);
    const endDate = new Date(endYear, endMonth - 1, endDay);
    const cclDays = Math.max(0, differenceInDays(endDate, startDate) + 1);
    
    return {
      sla: slaBoxes * config.slaBoxValue,
      ccl: cclDays * config.cclDailyValue,
      cclDaysCount: cclDays,
      total: (slaBoxes * config.slaBoxValue) + (cclDays * config.cclDailyValue)
    };
  }, [filteredData, config, dateRange, today]);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Informes Detallados</h1>
        <div className="flex flex-col items-end gap-1">
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
          <span className="text-xs text-slate-500 dark:text-slate-400 mr-2">
            Datos cargados: {dataRangeStr}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
        {[
          {
            label: 'Total Cargues',
            value: filteredData.filter(d => d.cuadrilla === 'SLA' || d.cuadrilla === 'CCL').length.toLocaleString(),
            icon: Truck,
            textColor: 'text-blue-700 dark:text-blue-300',
            bgColor: 'bg-blue-50 dark:bg-blue-950/40',
            borderColor: 'border-blue-100 dark:border-blue-900/50',
          },
          {
            label: 'Total Cajas',
            value: filteredData.reduce((acc, d) => acc + d.cajas, 0).toLocaleString(),
            icon: Package,
            textColor: 'text-indigo-700 dark:text-indigo-300',
            bgColor: 'bg-indigo-50 dark:bg-indigo-950/40',
            borderColor: 'border-indigo-100 dark:border-indigo-900/50',
          },
          {
            label: 'Tiempo Prom. x Cargue',
            value: `${Math.round(filteredData.reduce((acc, d) => acc + d.loadingTimeMinutes, 0) / (filteredData.length || 1)).toLocaleString()} min`,
            icon: Clock,
            textColor: 'text-violet-700 dark:text-violet-300',
            bgColor: 'bg-violet-50 dark:bg-violet-950/40',
            borderColor: 'border-violet-100 dark:border-violet-900/50',
          },
          {
            label: 'Costo SLA',
            value: `$${costs.sla.toLocaleString()}`,
            icon: DollarSign,
            textColor: 'text-red-700 dark:text-red-300',
            bgColor: 'bg-red-50 dark:bg-red-950/40',
            borderColor: 'border-red-100 dark:border-red-900/50',
          },
          {
            label: 'Costo CCL',
            value: `$${costs.ccl.toLocaleString()}`,
            icon: DollarSign,
            textColor: 'text-emerald-700 dark:text-emerald-300',
            bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
            borderColor: 'border-emerald-100 dark:border-emerald-900/50',
          },
        ].map((kpi, i) => (
          <div key={i} className={cn(
            "rounded-2xl border bg-white p-6 shadow-sm dark:bg-slate-900",
            kpi.borderColor
          )}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{kpi.label}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{kpi.value}</p>
              </div>
              <div className={cn("rounded-xl p-3", kpi.bgColor, kpi.textColor)}>
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
                  label={({ name, value }) => `${name}: ${value.toLocaleString()}`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => Number(value).toLocaleString()} />
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
              <BarChart data={crewAvgTimeData} margin={{ top: 16, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={config.theme === 'dark' ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey="name" tick={{ fill: config.theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 12, fontWeight: 600 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: config.theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 11 }} tickFormatter={(value) => Number(value).toLocaleString()} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(value) => Number(value).toLocaleString()}
                  cursor={{ fill: config.theme === 'dark' ? 'rgba(148,163,184,0.08)' : 'rgba(0,0,0,0.04)' }}
                  contentStyle={{
                    borderRadius: '10px',
                    border: 'none',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                    background: config.theme === 'dark' ? '#1e293b' : '#fff',
                    color: config.theme === 'dark' ? '#f1f5f9' : '#0f172a',
                    fontSize: 12,
                  }}
                />
                <Bar 
                  dataKey="avg" 
                  name="Minutos" 
                  radius={[6, 6, 0, 0]} 
                  maxBarSize={64} 
                  label={(props: any) => {
                    const { x, y, width, value } = props;
                    return (
                      <text x={x + width / 2} y={y + 15} fill="#fff" fontSize={12} fontWeight="bold" textAnchor="middle">
                        {Number(value).toLocaleString()}
                      </text>
                    );
                  }}
                >
                  {/* SLA = rojo operativo | CCL = azul corporativo */}
                  {crewAvgTimeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === 'SLA' ? '#dc2626' : '#2563eb'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Carrier Performance (Días de Retraso) */}
        <div className="col-span-1 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <h3 className="mb-4 sm:mb-6 text-sm sm:text-base font-semibold text-slate-800 dark:text-white">Desempeño por Transportadora (Días de Retraso)</h3>
          <div
            style={{
              height: isMobile
                ? Math.max(280, carrierData.length * 52)
                : 384,
            }}
          >
            {carrierData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  layout={isMobile ? 'vertical' : 'horizontal'}
                  data={carrierData} 
                  margin={{ 
                    top: isMobile ? 8 : 20, 
                    right: isMobile ? 48 : 24, 
                    left: isMobile ? 4 : 8, 
                    bottom: isMobile ? 8 : 16,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={isMobile} horizontal={!isMobile} stroke={config.theme === 'dark' ? '#334155' : '#e2e8f0'} />
                  {isMobile ? (
                    <>
                      <XAxis
                        type="number"
                        tick={{ fill: config.theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 10 }}
                        tickFormatter={(value) => Number(value).toLocaleString()}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fill: config.theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 500 }}
                        width={90}
                        tickLine={false}
                        axisLine={false}
                      />
                    </>
                  ) : (
                    <>
                      <XAxis
                        dataKey="name"
                        tick={{ fill: config.theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 11, fontWeight: 500 }}
                        height={44}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        type="number"
                        tick={{ fill: config.theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 11 }}
                        tickFormatter={(value) => Number(value).toLocaleString()}
                        tickLine={false}
                        axisLine={false}
                      />
                    </>
                  )}
                  <Tooltip
                    formatter={(value) => Number(value).toLocaleString()}
                    cursor={{ fill: config.theme === 'dark' ? 'rgba(148,163,184,0.08)' : 'rgba(0,0,0,0.04)' }}
                    contentStyle={{
                      borderRadius: '10px',
                      border: 'none',
                      boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                      background: config.theme === 'dark' ? '#1e293b' : '#fff',
                      color: config.theme === 'dark' ? '#f1f5f9' : '#0f172a',
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: isMobile ? 11 : 12, paddingTop: 8 }}
                  />
                  <Bar 
                    dataKey="retrasoTotal" 
                    name="Días de Retraso" 
                    radius={isMobile ? [0, 6, 6, 0] : [6, 6, 0, 0]}
                    maxBarSize={isMobile ? 28 : 56}
                    label={(props: any) => {
                      const { x, y, width, height, value } = props;
                      const offset = 8;
                      const textX = isMobile ? x + width + offset : x + width / 2;
                      const textY = isMobile ? y + height / 2 + 3 : y - offset;
                      const textAnchor = isMobile ? 'start' : 'middle';
                      return (
                        <text
                          x={textX}
                          y={textY}
                          fill={config.theme === 'dark' ? '#cbd5e1' : '#475569'}
                          fontSize={10}
                          fontWeight="bold"
                          textAnchor={textAnchor}
                        >
                          {Number(value).toLocaleString()}
                        </text>
                      );
                    }}
                  >
                    {carrierData.map((_, index) => (
                      <Cell key={`carrier-cell-${index}`} fill={getCarrierColor(index, carrierData.length)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400 text-sm">
                No hay datos de transportadoras en este rango
              </div>
            )}
          </div>
        </div>

        {/* Carrier Loads Count (A Tiempo vs Retrasados) */}
        <div className="col-span-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <h3 className="mb-6 font-semibold text-slate-800 dark:text-white">Cargues a Tiempo vs Retrasados por Transportadora</h3>
          <div className="h-96">
            {carrierData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  layout="vertical"
                  data={carrierData} 
                  margin={{ 
                    top: 20, 
                    right: 40, 
                    left: 80, 
                    bottom: 20 
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={false} stroke={config.theme === 'dark' ? '#334155' : '#e2e8f0'} />
                  <XAxis type="number" tick={{ fill: config.theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 10 }} tickFormatter={(value) => Number(value).toLocaleString()} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: config.theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 500 }} width={90} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(value) => Number(value).toLocaleString()}
                    cursor={{ fill: config.theme === 'dark' ? 'rgba(148,163,184,0.08)' : 'rgba(0,0,0,0.04)' }}
                    contentStyle={{
                      borderRadius: '10px',
                      border: 'none',
                      boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                      background: config.theme === 'dark' ? '#1e293b' : '#fff',
                      color: config.theme === 'dark' ? '#f1f5f9' : '#0f172a',
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Bar 
                    dataKey="aTiempo" 
                    name="Cargues a Tiempo"
                    fill="#16a34a"
                    radius={[0, 6, 6, 0]}
                    maxBarSize={26}
                    label={(props: any) => {
                      const { x, y, width, height, value } = props;
                      return (
                        <text
                          x={x + width + 8}
                          y={y + height / 2 + 3}
                          fill={config.theme === 'dark' ? '#cbd5e1' : '#475569'}
                          fontSize={10}
                          fontWeight="bold"
                          textAnchor="start"
                        >
                          {Number(value).toLocaleString()}
                        </text>
                      );
                    }}
                  />
                  <Bar 
                    dataKey="retrasados" 
                    name="Cargues Retrasados"
                    fill="#dc2626"
                    radius={[0, 6, 6, 0]}
                    maxBarSize={26}
                    label={(props: any) => {
                      const { x, y, width, height, value } = props;
                      return (
                        <text
                          x={x + width + 8}
                          y={y + height / 2 + 3}
                          fill={config.theme === 'dark' ? '#cbd5e1' : '#475569'}
                          fontSize={10}
                          fontWeight="bold"
                          textAnchor="start"
                        >
                          {Number(value).toLocaleString()}
                        </text>
                      );
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400 text-sm">
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
                <td className="py-4 text-slate-600 dark:text-slate-400">{filteredData.filter(d => d.cuadrilla === 'SLA').reduce((acc, d) => acc + d.cajas, 0).toLocaleString()} Cajas</td>
                <td className="py-4 text-slate-600 dark:text-slate-400">${config.slaBoxValue.toLocaleString()} / caja</td>
                <td className="py-4 font-bold text-slate-900 dark:text-white">${costs.sla.toLocaleString()}</td>
              </tr>
              <tr className="group">
                <td className="py-4 font-semibold text-blue-600">CCL (Pago Diario)</td>
                <td className="py-4 text-slate-600 dark:text-slate-400">{costs.cclDaysCount.toLocaleString()} Días</td>
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
