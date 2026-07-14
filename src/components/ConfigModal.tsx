import React from 'react';
import { X, Upload, Settings } from 'lucide-react';
import * as XLSX from 'xlsx';
import { AppConfig, RawOrderRow, OrderData } from '../types';
import { parseExcelDate, calculateMinutes, calculateDelayDays } from '../utils/dateUtils';
import { motion, AnimatePresence } from 'motion/react';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onConfigChange: (newConfig: AppConfig) => void;
  onDataLoaded: (data: OrderData[]) => void;
}

export default function ConfigModal({ isOpen, onClose, config, onConfigChange, onDataLoaded }: ConfigModalProps) {
  const [loading, setLoading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws) as RawOrderRow[];

        if (rawData.length === 0) {
          alert('El archivo Excel parece estar vacío.');
          return;
        }

        const processedData: OrderData[] = rawData.map((row, index) => {
          const rowKeys = Object.keys(row);
          const normalize = (s: string) => 
            s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

          const findKeyExact = (candidates: string[]) => 
            rowKeys.find(k => {
              const norm = normalize(k);
              return candidates.some(c => norm === c);
            });

          const findKeyContains = (candidates: string[]) => 
            rowKeys.find(k => {
              const norm = normalize(k);
              return candidates.some(c => norm.includes(c));
            });

          // 1. Scheduled / Appointment date column (FECHA)
          // Prioritize exact matches to avoid partial match with "fecha de cargue".
          let scheduledKey = findKeyExact(['fecha', 'cita', 'fecha programada', 'programada', 'scheduled']);
          if (!scheduledKey) {
            scheduledKey = findKeyContains(['fecha programada', 'programada', 'scheduled', 'cita']);
          }

          // 2. Loading date column (FECHA DE CARGUE)
          let cargueKey = findKeyExact(['fecha de cargue', 'fecha cargue', 'fecha_cargue', 'cargue', 'loading date']);
          if (!cargueKey) {
            cargueKey = findKeyContains(['fecha de cargue', 'fecha cargue', 'fecha_cargue', 'cargue']);
          }
          if (!cargueKey) {
            cargueKey = findKeyExact(['fecha inicio', 'inicio', 'start', 'fecha_inicio']) || 
                        findKeyContains(['fecha inicio', 'inicio', 'start']);
          }

          // 3. Start & End time/date columns
          let startKey = findKeyExact(['hora de inicio', 'hora inicio', 'hora_inicio', 'start time']);
          if (!startKey) {
            startKey = rowKeys.find(k => {
              const norm = normalize(k);
              return norm.includes('inicio') && !norm.includes('fecha');
            });
          }
          if (!startKey) {
            startKey = findKeyContains(['inicio', 'start']);
          }

          let endKey = findKeyExact(['hora de finalizacion', 'hora fin', 'hora_fin', 'end time']);
          if (!endKey) {
            endKey = findKeyContains(['finalizacion', 'fin', 'end']);
          }

          const startVal = startKey ? row[startKey] : null;
          const endVal = endKey ? row[endKey] : null;
          const scheduledVal = scheduledKey ? row[scheduledKey] : null;
          const cargueVal = cargueKey ? row[cargueKey] : null;

          let loadingDate = cargueVal instanceof Date ? cargueVal : parseExcelDate(cargueVal);
          let start = startVal instanceof Date ? startVal : parseExcelDate(startVal);
          let end = endVal instanceof Date ? endVal : parseExcelDate(endVal);
          let scheduled = scheduledVal instanceof Date ? scheduledVal : parseExcelDate(scheduledVal);

          // If we have a valid loadingDate, try to extract it from start/end if they contain actual date
          if (!loadingDate) {
            if (start && start.getFullYear() > 1910) {
              loadingDate = start;
            } else if (end && end.getFullYear() > 1910) {
              loadingDate = end;
            }
          }

          // Fallback if loadingDate is still not found: scan all values to find any date that is not scheduled
          if (!loadingDate) {
            for (const key of rowKeys) {
              if (key === scheduledKey) continue;
              const val = row[key];
              const d = val instanceof Date ? val : parseExcelDate(val);
              if (d && d.getFullYear() > 1910) {
                loadingDate = d;
                break;
              }
            }
          }

          // If loadingDate is still null, look at any date
          if (!loadingDate) {
            for (const key of rowKeys) {
              const val = row[key];
              const d = val instanceof Date ? val : parseExcelDate(val);
              if (d && d.getFullYear() > 1910) {
                loadingDate = d;
                break;
              }
            }
          }

          // Merge start and end times with loadingDate if they are just times (year < 1910)
          if (loadingDate) {
            if (start && start.getFullYear() < 1910) {
              start = new Date(loadingDate.getFullYear(), loadingDate.getMonth(), loadingDate.getDate(), start.getHours(), start.getMinutes(), start.getSeconds());
            }
            if (end && end.getFullYear() < 1910) {
              end = new Date(loadingDate.getFullYear(), loadingDate.getMonth(), loadingDate.getDate(), end.getHours(), end.getMinutes(), end.getSeconds());
            }
          }

          // Fallbacks
          if (start && start.getFullYear() < 1910 && loadingDate) start = loadingDate;
          if (end && end.getFullYear() < 1910 && loadingDate) end = loadingDate;
          
          if (!start && loadingDate) start = loadingDate;
          if (!end && loadingDate) end = loadingDate;

          const findKey = (candidates: string[]) => findKeyContains(candidates);
          const crewString = String(row[findKey(['cuadrilla', 'tipo', 'crew']) || ''] || '').toUpperCase();
          const cuadrillaType = crewString.includes('SLA') ? 'SLA' : (crewString.includes('LTSA') || crewString.includes('EXITO') || crewString.includes('ÉXITO')) ? 'LTSA' : 'CCL';

          return {
            id: String(row[findKey(['id', 'orden', 'codigo']) || ''] || index),
            cuadrilla: cuadrillaType as any,
            cajas: Number(row[findKey(['cajas', 'cantidad', 'boxes']) || ''] || 0),
            transportadora: String(row[findKey(['transportadora', 'carrier', 'empresa', 'cliente']) || ''] || 'N/A'),
            fechaInicio: start || new Date(),
            fechaFin: end || new Date(),
            fechaProgramada: scheduled || undefined,
            loadingTimeMinutes: start && end ? calculateMinutes(start, end) : 0,
            delayDays: loadingDate && scheduled ? calculateDelayDays(loadingDate, scheduled) : (end && scheduled ? calculateDelayDays(end, scheduled) : 0),
            valid: !!(start && end)
          };
        }).filter(item => (item as any).valid) as OrderData[];

        if (processedData.length === 0) {
          alert('No se pudieron procesar datos. Verifique que las columnas de "Hora de Inicio" y "Hora de Finalización" existan y tengan el formato correcto.');
        } else {
          onDataLoaded(processedData);
          onClose();
        }
      } catch (error) {
        console.error('Error parsing Excel:', error);
        alert('Error técnico al leer el archivo. Asegúrese de que sea un archivo .xlsx válido.');
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Configuración</h2>
              </div>
              <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-6 w-6 text-slate-400" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Valores de Costo */}
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">
                    Valor Caja Cuadrillas SLA
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input 
                      type="number"
                      value={config.slaBoxValue}
                      onChange={(e) => onConfigChange({ ...config, slaBoxValue: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-4 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">
                    Valor Diario Cuadrillas CCL
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input 
                      type="number"
                      value={config.cclDailyValue}
                      onChange={(e) => onConfigChange({ ...config, cclDailyValue: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-4 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Cargue de Archivo */}
              <div className="pt-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Importar Datos</h3>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".xlsx, .xls"
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-50"
                >
                  <Upload className="h-5 w-5" />
                  {loading ? 'Cargando...' : 'Seleccionar Excel'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
