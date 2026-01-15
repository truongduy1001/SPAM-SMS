
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Zap, Terminal, Smartphone, Activity, RefreshCw, 
  CheckCircle2, XCircle, Shield, ShieldCheck, 
  ShieldAlert, Settings, Globe, Database, Trash2
} from 'lucide-react';
import { OTP_SERVICES, triggerOTP } from './services/otpServices';
import { ServiceDefinition, LogEntry, SpamStats, ProxyConfig, ProxyItem } from './types';

const INITIAL_PROXY = "180.93.230.148:30281:gx66hgve:pLOC8j2C";

const App: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cycles, setCycles] = useState(1);
  const [isSpamming, setIsSpamming] = useState(false);
  const [services, setServices] = useState<ServiceDefinition[]>(OTP_SERVICES);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<SpamStats>({
    totalSent: 0, successCount: 0, failureCount: 0, currentCycle: 0, totalCycles: 0
  });
  
  const [proxy, setProxy] = useState<ProxyConfig>({
    rawList: INITIAL_PROXY,
    pool: [],
    enabled: true
  });
  const [showProxy, setShowProxy] = useState(false);
  
  const logEndRef = useRef<HTMLDivElement>(null);
  const stopRef = useRef(false);

  useEffect(() => {
    parseProxy(INITIAL_PROXY);
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const parseProxy = (raw: string) => {
    const pool = raw.split('\n')
      .filter(l => l.trim())
      .map(line => {
        const p = line.trim().split(':');
        return { host: p[0], port: p[1], user: p[2], pass: p[3] };
      })
      .filter(p => p.host && p.port);
    setProxy(prev => ({ ...prev, rawList: raw, pool }));
  };

  const addLog = useCallback((service: string, message: string, type: LogEntry['type']) => {
    setLogs(prev => [{
      id: Math.random().toString(36),
      timestamp: new Date().toLocaleTimeString(),
      service, message, type
    }, ...prev].slice(0, 50));
  }, []);

  const startPayload = async () => {
    if (!phoneNumber || phoneNumber.length < 9) {
      addLog('SYSTEM', "Nhập số điện thoại hợp lệ", 'error');
      return;
    }
    
    stopRef.current = false;
    setIsSpamming(true);
    setStats({ totalSent: 0, successCount: 0, failureCount: 0, currentCycle: 1, totalCycles: cycles });

    for (let c = 1; c <= cycles; c++) {
      if (stopRef.current) break;
      setStats(prev => ({ ...prev, currentCycle: c }));
      addLog('SYSTEM', `Bắt đầu đợt ${c}/${cycles}...`, 'info');

      for (const svc of services) {
        if (stopRef.current) break;
        setServices(prev => prev.map(s => s.id === svc.id ? { ...s, status: 'Pending' } : s));
        
        const res = await triggerOTP(svc.id, phoneNumber, proxy);
        
        if (res.success) {
          setStats(prev => ({ ...prev, totalSent: prev.totalSent + 1, successCount: prev.successCount + 1 }));
          setServices(prev => prev.map(s => s.id === svc.id ? { ...s, status: 'Success' } : s));
          addLog(svc.name, res.response, 'success');
        } else {
          setStats(prev => ({ ...prev, totalSent: prev.totalSent + 1, failureCount: prev.failureCount + 1 }));
          setServices(prev => prev.map(s => s.id === svc.id ? { ...s, status: 'Error' } : s));
          addLog(svc.name, res.response, 'error');
        }
        await new Promise(r => setTimeout(r, 1000));
      }
      if (c < cycles && !stopRef.current) {
        addLog('SYSTEM', "Nghỉ 5 giây...", 'warning');
        await new Promise(r => setTimeout(r, 5000));
      }
    }
    setIsSpamming(false);
    addLog('SYSTEM', "Hoàn tất tiến trình.", 'info');
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col gap-6 max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
            <Zap className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tighter uppercase">OTP <span className="text-emerald-400">PROXY</span> HUB</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Active Nodes: {proxy.pool.length}</p>
          </div>
        </div>
        <button onClick={() => setShowProxy(!showProxy)} className={`px-4 py-2 rounded-xl border flex items-center gap-2 transition-all ${proxy.enabled ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
          <Settings className="w-4 h-4" />
          <span className="text-xs font-bold uppercase">Proxy Settings</span>
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] shadow-xl">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 block">Target Device</label>
            <div className="relative mb-6">
              <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
              <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="0xxxxxxxxx" className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-4 text-white font-bold outline-none focus:border-emerald-500/50 transition-all" />
            </div>

            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rounds</label>
              <span className="text-emerald-400 font-mono font-bold">{cycles}x</span>
            </div>
            <input type="range" min="1" max="50" value={cycles} onChange={e => setCycles(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-full appearance-none accent-emerald-500 mb-8" />

            {isSpamming ? (
              <button onClick={() => stopRef.current = true} className="w-full bg-red-500/10 border border-red-500/30 text-red-500 font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-red-500/20 transition-all uppercase text-xs">
                <XCircle className="w-4 h-4" /> Stop Attack
              </button>
            ) : (
              <button onClick={startPayload} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all uppercase text-xs">
                <Zap className="w-4 h-4 fill-current" /> Execute Payload
              </button>
            )}
          </div>

          {showProxy && (
            <div className="bg-slate-900 border border-emerald-500/20 p-6 rounded-[2rem] animate-in zoom-in duration-200">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2"><Globe className="w-3 h-3"/> Proxy List</h3>
                  <label className="relative inline-flex items-center cursor-pointer scale-75">
                    <input type="checkbox" checked={proxy.enabled} onChange={e => setProxy({...proxy, enabled: e.target.checked})} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-800 rounded-full peer peer-checked:bg-emerald-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                  </label>
               </div>
               <textarea value={proxy.rawList} onChange={e => parseProxy(e.target.value)} placeholder="host:port:user:pass" className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-mono text-emerald-100/60 focus:border-emerald-500/30 outline-none resize-none" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl flex flex-col items-center">
              <span className="text-[8px] text-slate-600 uppercase font-black mb-1">Delivered</span>
              <span className="text-2xl font-black text-emerald-400">{stats.successCount}</span>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl flex flex-col items-center">
              <span className="text-[8px] text-slate-600 uppercase font-black mb-1">Failed</span>
              <span className="text-2xl font-black text-red-500">{stats.failureCount}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2"><Activity className="w-3 h-3 text-emerald-400"/> Infrastructure Status</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {services.map(svc => (
                <div key={svc.id} className={`p-4 rounded-2xl border flex flex-col gap-3 transition-all ${svc.status === 'Idle' ? 'bg-slate-950/40 border-slate-800 opacity-50' : svc.status === 'Pending' ? 'border-emerald-500/50 bg-emerald-500/5' : svc.status === 'Success' ? 'border-emerald-500 bg-emerald-500/10' : 'border-red-500/40 bg-red-500/5'}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-white truncate">{svc.name}</span>
                    {svc.status === 'Pending' ? <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" /> : svc.status === 'Success' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : svc.status === 'Error' ? <ShieldAlert className="w-3 h-3 text-red-500" /> : <Shield className="w-3 h-3 text-slate-700" />}
                  </div>
                  <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                    {svc.status === 'Pending' && <div className="h-full bg-emerald-500 animate-pulse w-full" />}
                    {svc.status === 'Success' && <div className="h-full bg-emerald-500 w-full" />}
                    {svc.status === 'Error' && <div className="h-full bg-red-500 w-full" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-[2rem] h-[400px] flex flex-col overflow-hidden shadow-inner">
            <div className="p-4 bg-slate-900/50 border-b border-slate-800 flex items-center gap-3">
              <Terminal className="w-3 h-3 text-emerald-400" />
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">System_Output_Live</span>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3 font-mono text-[10px] custom-scrollbar">
              {logs.length === 0 && <div className="h-full flex flex-col items-center justify-center text-slate-800 opacity-20 italic">Monitor Standby...</div>}
              {logs.map(log => (
                <div key={log.id} className="flex gap-3 animate-in fade-in slide-in-from-left-2">
                  <span className="text-slate-700 shrink-0">[{log.timestamp}]</span>
                  <span className={`font-black uppercase px-1.5 py-0.5 rounded text-[8px] h-fit ${log.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : log.type === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>{log.service}</span>
                  <span className={log.type === 'error' ? 'text-red-400/80' : 'text-slate-400'}>{log.message}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
