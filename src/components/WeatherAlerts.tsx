import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, AlertCircle, Info, ChevronRight, X, ShieldCheck, ExternalLink } from 'lucide-react';
import { WeatherAlert } from '../types';
import { cn } from '../lib/utils';

interface WeatherAlertsProps {
  alerts: WeatherAlert[];
}

const getSafetyMeasures = (alert: WeatherAlert) => {
  const common = [
    "Stay informed by listening to local radio and television for updates.",
    "Keep a battery-powered radio and extra batteries handy.",
    "Ensure your mobile devices are fully charged."
  ];

  const specific: Record<string, string[]> = {
    'Thunderstorm Warning': [
      "Unplug unnecessary electrical appliances.",
      "Stay away from windows and doors.",
      "Do not use corded phones except for emergencies."
    ],
    'Heavy Rain Alert': [
      "Avoid walking or driving through flood waters.",
      "Move essential items to upper floors if possible.",
      "Keep gutters and drains clear of debris."
    ],
    'Severe Snowfall': [
      "Keep a shovel and road salt/sand ready.",
      "Maintain a safe indoor temperature.",
      "Avoid overexertion when clearing snow."
    ],
    'High Wind Warning': [
      "Stay inside and away from windows.",
      "Watch for falling debris or power lines.",
      "If driving, keep both hands on the wheel."
    ]
  };

  return specific[alert.title] || common;
};

export const WeatherAlerts: React.FC<WeatherAlertsProps> = ({ alerts }) => {
  const [closedIds, setClosedIds] = React.useState<number[]>([]);
  const [selectedAlert, setSelectedAlert] = React.useState<WeatherAlert | null>(null);

  if (alerts.length === 0) return null;

  const activeAlerts = alerts.filter((_, idx) => !closedIds.includes(idx));

  if (activeAlerts.length === 0) return null;

  return (
    <div className="space-y-4 mb-12">
      <AnimatePresence>
        {activeAlerts.map((alert, idx) => (
          <motion.div
            key={`${alert.title}-${idx}`}
            initial={{ opacity: 0, x: -20, height: 0 }}
            animate={{ opacity: 1, x: 0, height: 'auto' }}
            exit={{ opacity: 0, x: 20, height: 0 }}
            className={cn(
              "relative overflow-hidden rounded-[24px] border backdrop-blur-xl transition-all shadow-2xl",
              alert.severity === 'critical' 
                ? "bg-rose-500/20 border-rose-500/30 text-rose-100" 
                : alert.severity === 'warning'
                ? "bg-amber-500/20 border-amber-500/30 text-amber-100"
                : "bg-blue-500/20 border-blue-500/30 text-blue-100"
            )}
          >
            <div className="p-6 md:p-8 flex gap-6 items-start">
              <div className={cn(
                "p-3 rounded-2xl shrink-0 shadow-lg",
                alert.severity === 'critical' ? "bg-rose-500/40" : alert.severity === 'warning' ? "bg-amber-500/40" : "bg-blue-500/40"
              )}>
                {alert.severity === 'critical' ? <AlertTriangle size={24} /> : alert.severity === 'warning' ? <AlertCircle size={24} /> : <Info size={24} />}
              </div>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                    alert.severity === 'critical' ? "bg-rose-500/20 border-rose-500/40" : alert.severity === 'warning' ? "bg-amber-500/20 border-amber-500/40" : "bg-blue-500/20 border-blue-500/40"
                  )}>
                    {alert.severity} Alert
                  </span>
                  <h3 className="text-xl font-bold tracking-tight">{alert.title}</h3>
                </div>
                <p className="text-sm md:text-base font-medium opacity-80 leading-relaxed max-w-2xl">
                  {alert.description}
                </p>
                <button 
                  onClick={() => setSelectedAlert(alert)}
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity pt-2 cursor-pointer"
                >
                  View Safety Protocol <ChevronRight size={14} />
                </button>
              </div>

              <button 
                onClick={() => setClosedIds([...closedIds, idx])}
                className="p-2 hover:bg-white/10 rounded-full transition-colors opacity-40 hover:opacity-100 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Severity Accent Bar */}
            <div className={cn(
              "absolute bottom-0 left-0 right-0 h-1.5",
              alert.severity === 'critical' ? "bg-rose-500" : alert.severity === 'warning' ? "bg-amber-500" : "bg-blue-500"
            )} />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Safety Protocol Modal */}
      <AnimatePresence>
        {selectedAlert && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAlert(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 cursor-pointer"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#1a1a1a] border border-white/10 rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl"
              >
                <div className={cn(
                  "p-8 border-b border-white/5",
                  selectedAlert.severity === 'critical' ? "bg-rose-500/10 text-rose-100" : "bg-amber-500/10 text-amber-100"
                )}>
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <ShieldCheck size={28} className={cn(selectedAlert.severity === 'critical' ? "text-rose-400" : "text-amber-400")} />
                      <h2 className="text-2xl font-bold tracking-tight">Safety Protocol</h2>
                    </div>
                    <button 
                      onClick={() => setSelectedAlert(null)}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                    >
                      <X size={24} />
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                        selectedAlert.severity === 'critical' ? "bg-rose-500/20 border-rose-500/40" : "bg-amber-500/20 border-amber-500/40"
                      )}>
                        {selectedAlert.severity}
                      </span>
                      <span className="text-white font-bold">{selectedAlert.title}</span>
                    </div>
                    <p className="text-sm opacity-60 italic">{selectedAlert.description}</p>
                  </div>
                </div>

                <div className="p-8 space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white/30">Recommended Actions</h4>
                    <ul className="space-y-4">
                      {getSafetyMeasures(selectedAlert).map((step, i) => (
                        <motion.li 
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * i }}
                          className="flex gap-4 items-start group"
                        >
                          <div className="h-6 w-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-white/40 group-hover:bg-white/10 group-hover:text-white transition-colors">
                            {i + 1}
                          </div>
                          <p className="text-sm text-white/80 leading-relaxed font-medium">
                            {step}
                          </p>
                        </motion.li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-6 border-t border-white/5">
                    <a 
                      href="https://www.weather.gov/safety" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-sm font-bold tracking-tight transition-all cursor-pointer"
                    >
                      Official Weather Safety Resources <ExternalLink size={16} />
                    </a>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
