import React from 'react';
import { Moon, Sun, Settings, LayoutDashboard, Users, FileBarChart } from 'lucide-react';
import { AppConfig } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  config: AppConfig;
  toggleTheme: () => void;
  onOpenSettings: () => void;
}

export default function DashboardHeader({ activeTab, setActiveTab, config, toggleTheme, onOpenSettings }: HeaderProps) {
  const tabs = [
    { id: 'orders', label: 'Ordenes de Cargue', icon: LayoutDashboard },
    { id: 'crews', label: 'Cuadrillas', icon: Users },
    { id: 'reports', label: 'Informes', icon: FileBarChart },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo Section */}
        <div className="flex items-center gap-8">
          <img 
            src="https://www.ccl.com.co/images/logo/logo-name-color.png" 
            alt="CCL Logo" 
            className="h-10 w-auto object-contain"
          />
          
          {/* Tabs */}
          <nav className="hidden items-center space-x-1 md:flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                    isActive 
                      ? "text-blue-600 dark:text-blue-400" 
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {isActive && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute -bottom-[21px] left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Actions Section */}
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleTheme}
            className="rounded-xl bg-slate-100 p-2.5 text-slate-600 transition-all hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            {config.theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>
          
          <button 
            onClick={onOpenSettings}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Configuración</span>
          </button>
        </div>
      </div>
    </header>
  );
}
