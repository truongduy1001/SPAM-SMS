
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
  AlertTriangle
} from 'lucide-react';
import { OTP_SERVICES, triggerOTP } from './services/otpServices';
import { generateSessionSummary } from './services/geminiReport';
import { ServiceDefinition, LogEntry, SpamStats, ProxyConfig } from './types';

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
  const [proxy, setProxy] = useState<ProxyConfig>({
    host: '',
    port: '',
    user: '',
    pass: '',
    enabled: false
  });
  const [showProxySettings, setShowProxySettings] = useState(false);
  const [geminiReport, setGeminiReport] = useState<string | null>(null);
  
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

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
      addLog('SYSTEM', `Bắt đầu đợt ${c}/${cycles} ${proxy.enabled ? '(Qua Proxy)' : '(Trực tiếp)'}`, 'info');

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
        
        await new Promise(r => setTimeout(r, 2500));
      }

      if (c < cycles && isSpamming) {
        addLog('SYSTEM', "Nghỉ 15 giây để xoay vòng IP...", 'warning');
        await new Promise(r => setTimeout(r, 15000));
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
    addLog('SYSTEM', "Yêu cầu dừng tiến trình.", 'warning');
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Proxy Info Header */}
      {!proxy.enabled && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex gap-4 items-start animate-pulse">
          <div className="p-2 bg-amber-500/20 rounded-lg shrink-0">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-xs">
            <h3 className="text-amber-400 font-bold uppercase mb-1">Cảnh báo: Đang dùng IP Vercel</h3>
            <p className="text-slate-400">
              IP mặc định của máy chủ Vercel thường bị các dịch vụ Việt Nam chặn. Hãy cấu hình <b>Rotating Proxy</b> (IP Dân cư) để đạt tỉ lệ thành công 100%.
            </p>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <Zap className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase italic">
              OTP <span className="text-emerald-400">Proxy Stealth</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-[0.2em] uppercase">Advanced Security Testing Node</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowProxySettings(!showProxySettings)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${proxy.enabled ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
          >
            <Settings className="w-4 h-4" />
            <span className="text-xs font-bold uppercase">Proxy Config</span>
            {proxy.enabled && <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        <div className="lg:col-span-4 space-y-6">
          {/* Target Config */}
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl backdrop-blur-sm">
            <h2 className="text-sm font-bold text-white mb-6 flex items-center gap-2 uppercase tracking-widest">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              Target Entity
            </h2>
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Phone Number</label>
                <input 
                  type="tel" 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="0xxxxxxxxx"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white mono focus:border-emerald-500/50 outline-none transition-all shadow-inner"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 flex justify-between">
                  <span>Intensity</span>
                  <span className="text-emerald-400 font-mono">{cycles} Rounds</span>
                </label>
                <input 
                  type="range" min="1" max="10" value={cycles}
                  onChange={(e) => setCycles(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none accent-emerald-500 cursor-pointer mb-2"
                />
              </div>
              <div className="pt-2">
                {isSpamming ? (
                  <button onClick={stopSpam} className="w-full bg-red-500/10 border border-red-500/30 text-red-500 font-bold py-4 rounded-2xl hover:bg-red-500/20 transition-all uppercase text-xs tracking-widest">
                    Abort Mission
                  </button>
                ) : (
                  <button onClick={runSpam} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.2)] transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-2">
                    Execute Payload
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Proxy Config Panel (Conditional) */}
          {showProxySettings && (
            <div className="bg-slate-900 border border-emerald-500/30 p-6 rounded-3xl shadow-2xl animate-in zoom-in duration-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-emerald-400 uppercase flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Proxy Settings
                </h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={proxy.enabled} onChange={(e) => setProxy({...proxy, enabled: e.target.checked})} className="sr-only peer" />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <input placeholder="Host" value={proxy.host} onChange={e => setProxy({...proxy, host: e.target.value})} className="col-span-2 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs mono text-white" />
                  <input placeholder="Port" value={proxy.port} onChange={e => setProxy({...proxy, port: e.target.value})} className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs mono text-white" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="User (Optional)" value={proxy.user} onChange={e => setProxy({...proxy, user: e.target.value})} className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs mono text-white" />
                  <input placeholder="Pass (Optional)" type="password" value={proxy.pass} onChange={e => setProxy({...proxy, pass: e.target.value})} className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs mono text-white" />
                </div>
                <p className="text-[9px] text-slate-500 italic">Hỗ trợ Rotating Proxy (HTTP/HTTPS) để vượt tường lửa.</p>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50 flex flex-col items-center">
                <span className="text-[9px] text-slate-500 uppercase font-black mb-1">Delivered</span>
                <span className="text-3xl font-black text-emerald-400 mono">{stats.successCount}</span>
              </div>
              <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50 flex flex-col items-center">
                <span className="text-[9px] text-slate-500 uppercase font-black mb-1">Blocked</span>
                <span className="text-3xl font-black text-red-500 mono">{stats.failureCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Center */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 flex-1 backdrop-blur-sm">
            <h2 className="text-sm font-bold text-white mb-6 flex items-center gap-2 uppercase tracking-widest">
              <Activity className="w-4 h-4 text-emerald-400" />
              Service Grid
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {services.map(svc => (
                <div key={svc.id} className={`p-4 rounded-2xl border flex flex-col gap-3 transition-all duration-500 ${svc.status === 'Idle' ? 'bg-slate-950/30 border-slate-800 opacity-40' : svc.status === 'Pending' ? 'border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/20' : svc.status === 'Success' ? 'border-emerald-500 bg-emerald-500/10' : 'border-red-500/50 bg-red-500/5'}`}>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black uppercase text-slate-200 truncate pr-2">{svc.name}</span>
                    {svc.status === 'Pending' ? <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" /> : svc.status === 'Success' ? <ShieldCheck className="w-3 h-3 text-emerald-400" /> : svc.status === 'Error' ? <ShieldAlert className="w-3 h-3 text-red-500" /> : <Shield className="w-3 h-3 text-slate-800" />}
                  </div>
                  <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                    {svc.status === 'Pending' && <div className="h-full bg-emerald-500 animate-progress w-full" />}
                    {svc.status === 'Success' && <div className="h-full bg-emerald-500 w-full" />}
                    {svc.status === 'Error' && <div className="h-full bg-red-500 w-full" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Console */}
          <div className="bg-slate-950 border border-slate-800 rounded-3xl h-80 overflow-hidden flex flex-col shadow-2xl relative">
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 backdrop-blur-md z-10">
              <div className="flex items-center gap-2">
                <Terminal className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em]">Traffic_Monitor_Log</span>
              </div>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500/20" />
                <div className="w-2 h-2 rounded-full bg-amber-500/20" />
                <div className="w-2 h-2 rounded-full bg-emerald-500/20" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-2 mono text-[10px] z-0">
              {logs.length === 0 && <div className="text-slate-800 uppercase font-bold text-center mt-20 tracking-widest opacity-30">System Idle - Awaiting Command</div>}
              {logs.map(log => (
                <div key={log.id} className="flex gap-3 group">
                  <span className="text-slate-600 shrink-0 font-bold opacity-50">[{log.timestamp}]</span>
                  <span className={`font-black shrink-0 px-1.5 rounded-sm ${log.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : log.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {log.service}
                  </span>
                  <span className="text-slate-400 group-hover:text-slate-100 transition-colors">{log.message}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
          
          {geminiReport && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-3xl animate-in slide-in-from-bottom-4 duration-700">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest italic">AI Ops Summary</h3>
              </div>
              <p className="text-[12px] text-emerald-100/70 leading-relaxed font-medium italic">{geminiReport}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
