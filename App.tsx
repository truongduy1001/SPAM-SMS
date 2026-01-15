
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Zap, 
  ShieldAlert, 
  Terminal, 
  Smartphone, 
  Activity, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  BarChart3,
  Play,
  Square,
  AlertTriangle,
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
  const [showWarning, setShowWarning] = useState(true);
  
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
      if (!isSpamming && c > 1) break; 
      
      setStats(prev => ({ ...prev, currentCycle: c }));
      addLog('SYSTEM', `Bắt đầu đợt ${c}/${cycles}`, 'info');

      const chunkSize = 5;
      for (let i = 0; i < services.length; i += chunkSize) {
        const chunk = services.slice(i, i + chunkSize);
        
        await Promise.all(chunk.map(async (svc) => {
          setServices(prev => prev.map(s => s.id === svc.id ? { ...s, status: 'Pending' } : s));
          
          const result = await triggerOTP(svc.id, phoneNumber);
          
          setServices(prev => prev.map(s => s.id === svc.id ? { ...s, status: result.success ? 'Success' : 'Error' } : s));
          
          if (result.success) {
            setStats(prev => ({ ...prev, totalSent: prev.totalSent + 1, successCount: prev.successCount + 1 }));
            addLog(svc.name, "Yêu cầu đã gửi thành công", 'success');
          } else {
            setStats(prev => ({ ...prev, totalSent: prev.totalSent + 1, failureCount: prev.failureCount + 1 }));
            addLog(svc.name, `Thất bại: ${result.response}`, 'error');
          }
        }));
      }

      if (c < cycles) {
        addLog('SYSTEM', "Nghỉ 5 giây để tránh bị block IP...", 'warning');
        await new Promise(r => setTimeout(r, 5000));
      }
    }

    setIsSpamming(false);
    addLog('SYSTEM', "Hoàn tất quá trình thử nghiệm.", 'info');
    const summary = await generateSessionSummary(logs);
    setGeminiReport(summary);
  };

  const stopSpam = () => {
    setIsSpamming(false);
    addLog('SYSTEM', "Đã dừng bởi người dùng.", 'warning');
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Warning Banner */}
      {showWarning && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex gap-4 items-start relative overflow-hidden group">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-amber-500 font-bold text-sm uppercase mb-1">Cảnh báo kỹ thuật: CORS Policy</h3>
            <p className="text-xs text-amber-200/70 leading-relaxed">
              Trình duyệt đang chặn các yêu cầu trực tiếp đến API của bên thứ ba để bảo mật. 
              Để <strong>gửi SMS thật</strong>, bạn cần chạy mã này thông qua một máy chủ Backend (NodeJS/Python) hoặc tắt bảo mật CORS của trình duyệt (không khuyến khích).
            </p>
          </div>
          <button onClick={() => setShowWarning(false)} className="text-amber-500/50 hover:text-amber-500 text-xs font-bold px-2 py-1">Đã hiểu</button>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <Zap className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase italic">
              OTP <span className="text-emerald-400">Security Suite</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium tracking-widest uppercase">
              Vulnerability Test Dashboard • v3.0.2
            </p>
          </div>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-lg flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Trạng thái</span>
              <span className="text-sm mono text-amber-400">Sandbox Mode</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        
        {/* Control Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl backdrop-blur-sm">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-400" />
              Thông số mục tiêu
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1">Số điện thoại nhận</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Ví dụ: 0912345678"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all mono"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <Smartphone className="w-4 h-4 text-slate-600" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1">Số đợt gửi ({cycles})</label>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  value={cycles}
                  onChange={(e) => setCycles(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              <div className="pt-4">
                {isSpamming ? (
                  <button 
                    onClick={stopSpam}
                    className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <Square className="w-5 h-5 fill-current" />
                    DỪNG TIẾN TRÌNH
                  </button>
                ) : (
                  <button 
                    onClick={runSpam}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all active:scale-95 uppercase tracking-wider"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    Bắt đầu TEST
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              Thống kê trực tiếp
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tổng yêu cầu</span>
                <span className="text-2xl font-black text-white mono">{stats.totalSent}</span>
              </div>
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Thành công</span>
                <span className="text-2xl font-black text-emerald-400 mono">{stats.successCount}</span>
              </div>
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Lỗi (CORS)</span>
                <span className="text-2xl font-black text-red-400 mono">{stats.failureCount}</span>
              </div>
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Đợt</span>
                <span className="text-2xl font-black text-blue-400 mono">{stats.currentCycle}/{stats.totalCycles}</span>
              </div>
            </div>
          </div>

          {geminiReport && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl animate-in fade-in duration-500">
               <h2 className="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-2 uppercase tracking-widest">
                <Info className="w-4 h-4" />
                Báo cáo từ AI
              </h2>
              <p className="text-xs text-emerald-100/80 leading-relaxed italic">
                "{geminiReport}"
              </p>
            </div>
          )}
        </div>

        {/* Services & Logs */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex-1 flex flex-col">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              Danh sách dịch vụ
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 overflow-y-auto pr-2 custom-scrollbar">
              {services.map(svc => (
                <div 
                  key={svc.id}
                  className={`
                    p-3 rounded-xl border transition-all duration-300 flex flex-col gap-2
                    ${svc.status === 'Idle' ? 'bg-slate-950/30 border-slate-800/50 text-slate-500' : ''}
                    ${svc.status === 'Pending' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : ''}
                    ${svc.status === 'Success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : ''}
                    ${svc.status === 'Error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : ''}
                  `}
                >
                  <span className="text-[9px] font-black uppercase truncate">{svc.name}</span>
                  {svc.status === 'Pending' && <RefreshCw className="w-3 h-3 animate-spin mx-auto" />}
                  {svc.status === 'Success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />}
                  {svc.status === 'Error' && <XCircle className="w-4 h-4 text-red-500 mx-auto" />}
                  {svc.status === 'Idle' && <div className="w-4 h-4 bg-slate-800 rounded-full mx-auto" />}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl h-80 flex flex-col shadow-inner">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h2 className="text-[10px] font-bold text-white uppercase tracking-widest">Nhật ký hệ thống (Console)</h2>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-1 mono text-[10px]">
              {logs.length === 0 && (
                <div className="text-slate-700 italic">Chờ khởi tạo...</div>
              )}
              {logs.map(log => (
                <div key={log.id} className="flex gap-2 border-l border-slate-800 pl-2 hover:bg-slate-900/30 transition-colors">
                  <span className="text-slate-600">[{log.timestamp}]</span>
                  <span className={`font-bold ${
                    log.type === 'success' ? 'text-emerald-500' : 
                    log.type === 'error' ? 'text-red-500' : 
                    log.type === 'warning' ? 'text-yellow-500' : 'text-blue-500'
                  }`}>
                    {log.service}:
                  </span>
                  <span className="text-slate-400">{log.message}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-auto py-4 border-t border-slate-800/50 flex items-center justify-between text-[10px] text-slate-500 uppercase font-bold tracking-widest">
        <span>Cơ chế bảo vệ CORS: Hoạt động</span>
        <span>© 2024 OTP Security Dashboard</span>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;
