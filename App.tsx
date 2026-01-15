
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Zap, 
  Terminal, 
  Smartphone, 
  Activity, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  BarChart3,
  Play,
  Square,
  Globe,
  Info
} from 'lucide-react';
import { OTP_SERVICES, triggerOTP } from './services/otpServices';
import { generateSessionSummary } from './services/geminiReport';
import { ServiceDefinition, LogEntry, SpamStats } from './types';

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
  const [geminiReport, setGeminiReport] = useState<string | null>(null);
  
  const logEndRef = useRef<HTMLDivElement>(null);

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
      alert("Vui lòng nhập số điện thoại hợp lệ.");
      return;
    }

    setIsSpamming(true);
    setGeminiReport(null);
    setStats(prev => ({ ...prev, totalSent: 0, successCount: 0, failureCount: 0, currentCycle: 1, totalCycles: cycles }));
    
    for (let c = 1; c <= cycles; c++) {
      setStats(prev => ({ ...prev, currentCycle: c }));
      addLog('SYSTEM', `Bắt đầu đợt ${c}/${cycles} qua Vercel Proxy`, 'info');

      const chunkSize = 3; // Giới hạn chunk nhỏ để tránh timeout serverless
      for (let i = 0; i < services.length; i += chunkSize) {
        const chunk = services.slice(i, i + chunkSize);
        
        await Promise.all(chunk.map(async (svc) => {
          setServices(prev => prev.map(s => s.id === svc.id ? { ...s, status: 'Pending' } : s));
          
          const result = await triggerOTP(svc.id, phoneNumber);
          
          setServices(prev => prev.map(s => s.id === svc.id ? { ...s, status: result.success ? 'Success' : 'Error' } : s));
          
          if (result.success) {
            setStats(prev => ({ ...prev, totalSent: prev.totalSent + 1, successCount: prev.successCount + 1 }));
            addLog(svc.name, "Yêu cầu Proxy thành công", 'success');
          } else {
            setStats(prev => ({ ...prev, totalSent: prev.totalSent + 1, failureCount: prev.failureCount + 1 }));
            addLog(svc.name, `Thất bại qua Proxy: ${result.response}`, 'error');
          }
        }));
        // Delay nhỏ giữa các chunk
        await new Promise(r => setTimeout(r, 1000));
      }

      if (c < cycles) {
        addLog('SYSTEM', "Nghỉ 10 giây để bảo vệ IP máy chủ...", 'warning');
        await new Promise(r => setTimeout(r, 10000));
      }
    }

    setIsSpamming(false);
    addLog('SYSTEM', "Tiến trình hoàn tất.", 'info');
    const summary = await generateSessionSummary(logs);
    setGeminiReport(summary);
  };

  const stopSpam = () => {
    setIsSpamming(false);
    addLog('SYSTEM', "Đã dừng bởi người dùng.", 'warning');
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Status Banner */}
      <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex gap-4 items-center">
        <div className="p-2 bg-blue-500/20 rounded-lg">
          <Globe className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h3 className="text-blue-400 font-bold text-xs uppercase">Vercel Deployment Mode</h3>
          <p className="text-[10px] text-blue-200/60">Tất cả yêu cầu được thực hiện qua Serverless API để vượt qua CORS.</p>
        </div>
      </div>

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <Zap className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase italic">
              OTP <span className="text-emerald-400">Security Dashboard</span>
            </h1>
          </div>
        </div>
        
        <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-lg flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Server Location</span>
            <span className="text-sm mono text-emerald-400">Vercel Edge</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-400" />
              Cấu hình
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Số điện thoại</label>
                <input 
                  type="text" 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="0912345678"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Số đợt gửi ({cycles})</label>
                <input 
                  type="range" min="1" max="5" value={cycles}
                  onChange={(e) => setCycles(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none accent-emerald-500"
                />
              </div>
              <div className="pt-4">
                {isSpamming ? (
                  <button onClick={stopSpam} className="w-full bg-red-500/10 border border-red-500/30 text-red-500 font-bold py-4 rounded-xl">DỪNG</button>
                ) : (
                  <button onClick={runSpam} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)]">BẮT ĐẦU</button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2 text-sm uppercase">Thống kê</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                <span className="text-[10px] text-slate-500 uppercase block">Thành công</span>
                <span className="text-xl font-black text-emerald-400 mono">{stats.successCount}</span>
              </div>
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                <span className="text-[10px] text-slate-500 uppercase block">Thất bại</span>
                <span className="text-xl font-black text-red-400 mono">{stats.failureCount}</span>
              </div>
            </div>
          </div>
          
          {geminiReport && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
              <h3 className="text-[10px] font-bold text-emerald-400 uppercase mb-2">AI Summary</h3>
              <p className="text-[11px] text-emerald-100/70 italic leading-relaxed">{geminiReport}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex-1">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              Service Status
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {services.map(svc => (
                <div key={svc.id} className={`p-3 rounded-xl border flex flex-col gap-1 ${svc.status === 'Idle' ? 'bg-slate-950/30 border-slate-800/50' : svc.status === 'Pending' ? 'border-blue-500/50 bg-blue-500/5' : svc.status === 'Success' ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-red-500/50 bg-red-500/5'}`}>
                  <span className="text-[8px] font-bold uppercase text-slate-400 truncate">{svc.name}</span>
                  {svc.status === 'Pending' ? <RefreshCw className="w-3 h-3 animate-spin text-blue-400" /> : svc.status === 'Success' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : svc.status === 'Error' ? <XCircle className="w-3 h-3 text-red-400" /> : <div className="h-3" />}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl h-64 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-slate-800 flex items-center gap-2">
              <Terminal className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-bold text-white uppercase">Console Log</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1 mono text-[10px]">
              {logs.map(log => (
                <div key={log.id} className="flex gap-2">
                  <span className="text-slate-600">[{log.timestamp}]</span>
                  <span className={log.type === 'success' ? 'text-emerald-500' : log.type === 'error' ? 'text-red-500' : 'text-blue-500'}>{log.service}: {log.message}</span>
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
