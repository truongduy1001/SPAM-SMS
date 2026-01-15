
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
  Info,
  AlertTriangle
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
      addLog('SYSTEM', "Số điện thoại không hợp lệ", 'error');
      return;
    }

    setIsSpamming(true);
    setGeminiReport(null);
    setStats({ totalSent: 0, successCount: 0, failureCount: 0, currentCycle: 1, totalCycles: cycles });
    
    for (let c = 1; c <= cycles; c++) {
      if (!isSpamming && c > 1) break; 
      
      setStats(prev => ({ ...prev, currentCycle: c }));
      addLog('SYSTEM', `Bắt đầu đợt ${c}/${cycles}`, 'info');

      // Gửi tuần tự để tránh bị Rate Limit IP server quá nhanh
      for (const svc of services) {
        setServices(prev => prev.map(s => s.id === svc.id ? { ...s, status: 'Pending' } : s));
        
        const result = await triggerOTP(svc.id, phoneNumber);
        
        if (result.success) {
          setStats(prev => ({ ...prev, totalSent: prev.totalSent + 1, successCount: prev.successCount + 1 }));
          setServices(prev => prev.map(s => s.id === svc.id ? { ...s, status: 'Success' } : s));
          addLog(svc.name, "Yêu cầu gửi thành công", 'success');
        } else {
          setStats(prev => ({ ...prev, totalSent: prev.totalSent + 1, failureCount: prev.failureCount + 1 }));
          setServices(prev => prev.map(s => s.id === svc.id ? { ...s, status: 'Error' } : s));
          addLog(svc.name, `Lỗi: ${result.response}`, 'error');
        }
        
        // Delay 1.5s giữa mỗi dịch vụ để lách bộ lọc spam đơn giản
        await new Promise(r => setTimeout(r, 1500));
      }

      if (c < cycles) {
        addLog('SYSTEM', "Nghỉ 15 giây trước đợt tiếp theo...", 'warning');
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
    addLog('SYSTEM', "Đã dừng bởi người dùng.", 'warning');
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Alert Box */}
      <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex gap-4 items-start">
        <div className="p-2 bg-amber-500/20 rounded-lg shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
        </div>
        <div className="text-xs leading-relaxed">
          <h3 className="text-amber-400 font-bold uppercase mb-1">Lưu ý quan trọng</h3>
          <p className="text-amber-200/70">
            Nếu "Yêu cầu thành công" nhưng không có SMS: Dịch vụ đó có thể đã chặn IP của máy chủ Vercel hoặc yêu cầu CAPTCHA mà proxy không giải được. 
            Thử lại sau 15-30 phút hoặc dùng số điện thoại khác.
          </p>
        </div>
      </div>

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <Zap className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase italic">
              OTP <span className="text-emerald-400">Security Suite</span>
            </h1>
          </div>
        </div>
        
        <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-lg flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Node Status</span>
            <span className="text-sm mono text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Edge Online
            </span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-400" />
              Target Config
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Số điện thoại</label>
                <input 
                  type="tel" 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Ví dụ: 0987654321"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white mono focus:border-emerald-500/50 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 flex justify-between">
                  <span>Số đợt lặp</span>
                  <span className="text-emerald-400">{cycles} Cycles</span>
                </label>
                <input 
                  type="range" min="1" max="5" value={cycles}
                  onChange={(e) => setCycles(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none accent-emerald-500 cursor-pointer"
                />
              </div>
              <div className="pt-4">
                {isSpamming ? (
                  <button onClick={stopSpam} className="w-full bg-red-500/10 border border-red-500/30 text-red-500 font-bold py-4 rounded-xl hover:bg-red-500/20 transition-all">
                    DỪNG TIẾN TRÌNH
                  </button>
                ) : (
                  <button onClick={runSpam} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all transform active:scale-[0.98]">
                    BẮT ĐẦU GỬI OTP
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
            <h2 className="text-[10px] font-bold text-slate-500 uppercase mb-4 tracking-widest">Live Statistics</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                <span className="text-[10px] text-slate-500 uppercase block mb-1">Success</span>
                <span className="text-2xl font-black text-emerald-400 mono">{stats.successCount}</span>
              </div>
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                <span className="text-[10px] text-slate-500 uppercase block mb-1">Failed</span>
                <span className="text-2xl font-black text-red-400 mono">{stats.failureCount}</span>
              </div>
            </div>
          </div>
          
          {geminiReport && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-3 h-3 text-emerald-400" />
                <h3 className="text-[10px] font-bold text-emerald-400 uppercase">AI Security Report</h3>
              </div>
              <p className="text-[11px] text-emerald-100/70 italic leading-relaxed">{geminiReport}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex-1">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              Endpoints Available
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {services.map(svc => (
                <div key={svc.id} className={`p-3 rounded-xl border flex flex-col gap-2 transition-all duration-300 ${svc.status === 'Idle' ? 'bg-slate-950/30 border-slate-800/50 opacity-60' : svc.status === 'Pending' ? 'border-blue-500/50 bg-blue-500/5 ring-1 ring-blue-500/20' : svc.status === 'Success' ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-red-500/50 bg-red-500/5'}`}>
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-bold uppercase text-slate-300 truncate pr-2">{svc.name}</span>
                    {svc.status === 'Pending' ? <RefreshCw className="w-3 h-3 animate-spin text-blue-400" /> : svc.status === 'Success' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : svc.status === 'Error' ? <XCircle className="w-3 h-3 text-red-400" /> : <div className="w-3 h-3 rounded-full border border-slate-700" />}
                  </div>
                  <span className="text-[7px] text-slate-500 uppercase tracking-tighter">{svc.category}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl h-80 overflow-hidden flex flex-col shadow-2xl">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-2">
                <Terminal className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">Network Traffic Log</span>
              </div>
              <span className="text-[8px] mono text-slate-500">v1.2.0-stable</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1.5 mono text-[10px]">
              {logs.length === 0 && (
                <div className="text-slate-700 italic">Waiting for connection...</div>
              )}
              {logs.map(log => (
                <div key={log.id} className="flex gap-2 animate-in fade-in duration-300">
                  <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                  <span className={`font-bold shrink-0 ${log.type === 'success' ? 'text-emerald-500' : log.type === 'error' ? 'text-red-500' : log.type === 'warning' ? 'text-amber-500' : 'text-blue-500'}`}>
                    {log.service}:
                  </span>
                  <span className="text-slate-300 italic">{log.message}</span>
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
