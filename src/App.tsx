import React from 'react';
import { AppConfig, OrderData } from './types';
import DashboardHeader from './components/DashboardHeader';
import ConfigModal from './components/ConfigModal';
import OrdersTable from './components/OrdersTable';
import CrewsView from './components/CrewsView';
import ReportsView from './components/ReportsView';
import { motion, AnimatePresence } from 'motion/react';

const DEFAULT_CONFIG: AppConfig = {
  slaBoxValue: 500, // Valor por defecto
  cclDailyValue: 150000, // Valor por defecto
  theme: 'light'
};

export default function App() {
  const [config, setConfig] = React.useState<AppConfig>(() => {
    const saved = localStorage.getItem('ccl_config');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });
  
  const [data, setData] = React.useState<OrderData[]>([]);
  const [activeTab, setActiveTab] = React.useState('orders');
  const [isConfigOpen, setIsConfigOpen] = React.useState(false);

  // Persist config
  React.useEffect(() => {
    localStorage.setItem('ccl_config', JSON.stringify(config));
    if (config.theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  }, [config]);

  const toggleTheme = () => {
    setConfig(prev => {
      const newTheme = prev.theme === 'light' ? 'dark' : 'light';
      return { ...prev, theme: newTheme };
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 transition-colors duration-300 dark:bg-slate-950">
      <DashboardHeader 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        config={config} 
        toggleTheme={toggleTheme}
        onOpenSettings={() => setIsConfigOpen(true)}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'orders' && <OrdersTable data={data} />}
            {activeTab === 'crews' && <CrewsView data={data} />}
            {activeTab === 'reports' && <ReportsView data={data} config={config} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <ConfigModal 
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={config}
        onConfigChange={setConfig}
        onDataLoaded={setData}
      />

      {/* Floating help or status if no data */}
      {data.length === 0 && !isConfigOpen && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg"
        >
          Para comenzar, cargue un archivo Excel en Configuración
        </motion.div>
      )}
    </div>
  );
}
