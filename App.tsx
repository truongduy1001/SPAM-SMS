
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Zap, 
  Terminal, 
  Smartphone, 
  Activity, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Settings,
  Globe,
  Database,
  Layers
} from 'lucide-react';
import { OTP_SERVICES, triggerOTP } from './services/otpServices';
import { generateSessionSummary } from './services/geminiReport';
import { ServiceDefinition, LogEntry, SpamStats, ProxyConfig, ProxyItem } from './types';

const App: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cycles, setCycles] = useState(1);
  const [isSpamming, setIsSpamming] = useState(false);
  const [services, setServices] = useState<ServiceDefinition[]>(OTP_SERVICES);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<SpamStats>({
    totalSent: 0,
    successCount: 0,
    failureCount: 0,
    currentCycle: 0,
    totalCycles: 0
  });
  
  // Proxy state nâng cao
  const [proxy, setProxy] = useState<ProxyConfig>({
    rawList: '',
    pool: [],
    enabled: false
  });
  const [showProxySettings, setShowProxySettings] = useState(false);
  const [geminiReport, setGeminiReport] = useState<string | null>(null);
  
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Hàm parse danh sách proxy thông minh
  const updateProxyPool = (raw: string) => {
    const lines = raw.split('\n').filter(line => line.trim().length > 0);
    const newPool: ProxyItem[] = lines.map(line => {
      const parts = line.trim().split(':');
      return {
        host: parts[0] || '',
        port: parts[1] || '',
        user: parts[2] || undefined,
        pass: parts[3] || undefined
      };
    }).filter(p => p.host && p.port);
    
    setProxy(prev => ({ ...prev, rawList: raw, pool: newPool }));
  };

  const addLog = useCallback((service: string, message: string, type: LogEntry['type']) => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      service,
      message,
      type
    };
    setLogs(prev => [newLog, ...prev].slice(0, 100));
  }, []);

  const runSpam = async () => {
    if (!phoneNumber || phoneNumber.length < 9) {
      addLog('SYSTEM', "Số điện thoại không hợp lệ", 'error');
      return;
    }

    setIsSpamming(true);
    setGeminiReport(null);
    setStats({ totalSent: 0, successCount: 0, failureCount: 0, currentCycle: 1, totalCycles: cycles });
    
    for (let c = 1; c <= cycles; c++) {
      if (!isSpamming && c > 1) break; 
      
      setStats(prev => ({ ...prev, currentCycle: c }));
      addLog('SYSTEM', `Bắt đầu đợt ${c}/${cycles} - ${proxy.enabled ? `Xoay vòng ${proxy.pool.length} IPs` : 'Chạy IP gốc'}`, 'info');

      for (const svc of services) {
        if (!isSpamming) break;
        setServices(prev => prev.map(s => s.id === svc.id ? { ...s, status: 'Pending' } : s));
        
        const result = await triggerOTP(svc.id, phoneNumber, proxy);
        
        if (result.success) {
          setStats(prev => ({ ...prev, totalSent: prev.totalSent + 1, successCount: prev.successCount + 1 }));
          setServices(prev => prev.map(s => s.id === svc.id ? { ...s, status: 'Success' } : s));
          addLog(svc.name, result.response, 'success');
        } else {
          setStats(prev => ({ ...prev, totalSent: prev.totalSent + 1, failureCount: prev.failureCount + 1 }));
          setServices(prev => prev.map(s => s.id === svc.id ? { ...s, status: 'Error' } : s));
          addLog(svc.name, result.response, 'error');
        }
        
        // Delay nhỏ giữa các service để không bị sốc
        await new Promise(r => setTimeout(r, 1500));
      }

      if (c < cycles && isSpamming) {
        addLog('SYSTEM', "Nghỉ 10s trước khi xoay vòng IP mới...", 'warning');
        await new Promise(r => setTimeout(r, 10000));
      }
    }

    setIsSpamming(false);
    addLog('SYSTEM', "Tiến trình hoàn tất.", 'info');
    try {
        const summary = await generateSessionSummary(logs);
        setGeminiReport(summary);
    } catch (e) {
        console.error("AI Report error", e);
    }
  };

  const stopSpam = () => {
    setIsSpamming(false);
    addLog('SYSTEM', "Hủy lệnh.", 'warning');
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header Intelligence */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/50 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
            <Layers className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic flex items-center gap-2">
              STEALTH <span className="text-emerald-400">ROTATOR</span> V2
            </h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] text-slate-500 font-bold tracking-[0.3em] uppercase">Residential Proxy Infrastructure</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end mr-4">
             <span className="text-[10px] text-slate-500 font-bold uppercase">Proxy Pool Status</span>
             <span className={`text-xs font-mono font-bold ${proxy.pool.length > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                {proxy.pool.length} ACTIVE NODES
             </span>
          </div>
          <button 
            onClick={() => setShowProxySettings(!showProxySettings)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl border transition-all hover:scale-105 active:scale-95 ${proxy.enabled ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-500'}`}
          >
            <Settings className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-widest">Proxy Center</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        <div className="lg:col-span-4 space-y-6">
          {/* Main Controls */}
          <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] backdrop-blur-xl shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Smartphone className="w-24 h-24 text-white" />
            </div>
            
            <h2 className="text-xs font-black text-slate-400 mb-8 flex items-center gap-2 uppercase tracking-[0.2em]">
              <Database className="w-4 h-4 text-emerald-400" />
              Mission Parameters
            </h2>
            
            <div className="space-y-6">
              <div className="relative">
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 ml-1 tracking-widest">Target Phone</label>
                <input 
                  type="tel" 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Ex: 0987654321"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl px-6 py-4 text-white mono focus:border-emerald-500/50 outline-none transition-all shadow-2xl text-lg font-bold"
                />
              </div>

              <div>
                <div className="flex justify-between items-end mb-3 px-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Blast Intensity</label>
                    <span className="text-emerald-400 font-mono font-bold text-sm bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">{cycles} CYCLES</span>
                </div>
                <input 
                  type="range" min="1" max="20" value={cycles}
                  onChange={(e) => setCycles(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-full appearance-none accent-emerald-500 cursor-pointer mb-2"
                />
              </div>

              <div className="pt-4">
                {isSpamming ? (
                  <button onClick={stopSpam} className="w-full bg-red-500/10 border border-red-500/30 text-red-500 font-black py-5 rounded-2xl hover:bg-red-500/20 transition-all uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-2">
                    <XCircle className="w-4 h-4" /> Terminate
                  </button>
                ) : (
                  <button onClick={runSpam} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-5 rounded-2xl shadow-[0_10px_40px_rgba(16,185,129,0.3)] transition-all uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-3 group">
                    <Zap className="w-4 h-4 fill-current group-hover:scale-125 transition-transform" /> 
                    Engage Target
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Proxy Pool Panel */}
          {showProxySettings && (
            <div className="bg-slate-900 border border-emerald-500/30 p-8 rounded-[2.5rem] shadow-2xl animate-in fade-in zoom-in duration-300">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-black text-emerald-400 uppercase flex items-center gap-2 tracking-[0.2em]">
                  <Globe className="w-4 h-4" />
                  Proxy Intelligence
                </h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={proxy.enabled} onChange={(e) => setProxy({...proxy, enabled: e.target.checked})} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
              
              <div className="space-y-4">
                <div>
                    <label className="block text-[9px] font-black text-slate-500 uppercase mb-2 tracking-widest">Proxy List (host:port:user:pass)</label>
                    <textarea 
                        value={proxy.rawList}
                        onChange={(e) => updateProxyPool(e.target.value)}
                        placeholder="1.2.3.4:8080:user:pass&#10;5.6.7.8:9999"
                        className="w-full h-40 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[11px] mono text-emerald-100/70 focus:border-emerald-500/40 outline-none resize-none"
                    />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800/50">
                    <span className="text-[10px] text-slate-500 font-bold">PARSED NODES:</span>
                    <span className="text-emerald-400 font-mono font-bold text-sm">{proxy.pool.length}</span>
                </div>
                <p className="text-[9px] text-slate-600 italic leading-relaxed text-center">
                    Hệ thống sẽ tự động bốc ngẫu nhiên 1 IP mỗi lần gửi OTP để tránh bị khóa dải.
                </p>
              </div>
            </div>
          )}

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl flex flex-col items-center">
                <span className="text-[10px] text-slate-500 uppercase font-black mb-2 tracking-tighter">SUCCESSFUL</span>
                <span className="text-4xl font-black text-emerald-400 mono tabular-nums">{stats.successCount}</span>
              </div>
              <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl flex flex-col items-center">
                <span className="text-[10px] text-slate-500 uppercase font-black mb-2 tracking-tighter">FAILED</span>
                <span className="text-4xl font-black text-red-500 mono tabular-nums">{stats.failureCount}</span>
              </div>
          </div>
        </div>

        {/* Console & Service Monitoring */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-8 flex-1 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
            <h2 className="text-xs font-black text-slate-400 mb-8 flex items-center gap-2 uppercase tracking-[0.2em]">
              <Activity className="w-4 h-4 text-emerald-400" />
              Cluster Monitoring
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              {services.map(svc => (
                <div key={svc.id} className={`group p-5 rounded-3xl border flex flex-col gap-4 transition-all duration-700 relative overflow-hidden ${svc.status === 'Idle' ? 'bg-slate-950/30 border-slate-800 opacity-40 hover:opacity-100' : svc.status === 'Pending' ? 'border-emerald-500/50 bg-emerald-500/10 ring-2 ring-emerald-500/20' : svc.status === 'Success' ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'border-red-500/50 bg-red-500/10'}`}>
                  <div className="flex justify-between items-start z-10">
                    <span className="text-[11px] font-black uppercase text-slate-200 tracking-wider truncate">{svc.name}</span>
                    {svc.status === 'Pending' ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> : svc.status === 'Success' ? <ShieldCheck className="w-4 h-4 text-emerald-400" /> : svc.status === 'Error' ? <ShieldAlert className="w-4 h-4 text-red-500" /> : <Shield className="w-4 h-4 text-slate-800 group-hover:text-slate-600" />}
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden z-10">
                    {svc.status === 'Pending' && <div className="h-full bg-emerald-500 animate-pulse w-full" />}
                    {svc.status === 'Success' && <div className="h-full bg-emerald-500 w-full shadow-[0_0_10px_#10b981]" />}
                    {svc.status === 'Error' && <div className="h-full bg-red-500 w-full" />}
                  </div>
                  {/* Subtle background glow */}
                  {svc.status === 'Success' && <div className="absolute inset-0 bg-emerald-500/5 animate-pulse" />}
                </div>
              ))}
            </div>
          </div>

          {/* High-Tech Terminal */}
          <div className="bg-slate-950 border border-slate-800 rounded-[2.5rem] h-[450px] overflow-hidden flex flex-col shadow-2xl relative">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Signal_Intercept_Log</span>
              </div>
              <div className="flex gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/30" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/30" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/30" />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-3 mono text-[11px] z-0 custom-scrollbar">
              {logs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-800 opacity-20 select-none">
                    <Terminal className="w-16 h-16 mb-4" />
                    <span className="font-black text-lg tracking-[0.5em] uppercase italic">System Standby</span>
                </div>
              )}
              {logs.map(log => (
                <div key={log.id} className="flex gap-4 group animate-in slide-in-from-left-2 duration-300">
                  <span className="text-slate-700 shrink-0 font-bold opacity-40">[{log.timestamp}]</span>
                  <span className={`font-black shrink-0 px-2 py-0.5 rounded-md text-[10px] tracking-widest ${log.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : log.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                    {log.service}
                  </span>
                  <span className="text-slate-400 group-hover:text-slate-100 transition-colors font-medium">{log.message}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>

            {/* AI Report overlay at the bottom of terminal */}
            {geminiReport && (
                <div className="absolute bottom-6 left-6 right-6 p-6 bg-slate-900/95 border border-emerald-500/30 rounded-2xl shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-6 duration-500 z-20">
                    <div className="flex items-center gap-3 mb-3 border-b border-emerald-500/10 pb-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest italic">AI Command Analysis</h3>
                    </div>
                    <p className="text-[12px] text-emerald-100/80 leading-relaxed font-medium italic">{geminiReport}</p>
                </div>
            )}
          </div>
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}</style>
    </div>
  );
};

export default App;
