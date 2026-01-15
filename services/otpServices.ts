
import { ServiceDefinition, ProxyConfig, ProxyItem } from '../types';

export const OTP_SERVICES: ServiceDefinition[] = [
  { id: 'vexere', name: 'Vexere.com', category: 'Retail', status: 'Idle' },
  { id: 'fptplay', name: 'FPT Play', category: 'Media', status: 'Idle' },
  { id: 'ghn', name: 'GHN Express', category: 'Retail', status: 'Idle' },
  { id: 'fptshop', name: 'FPT Shop', category: 'Retail', status: 'Idle' },
  { id: 'ahamove', name: 'Ahamove', category: 'Retail', status: 'Idle' },
  { id: 'lalamove', name: 'Lalamove', category: 'Retail', status: 'Idle' },
];

export const triggerOTP = async (
  serviceId: string, 
  phone: string, 
  proxyConfig?: ProxyConfig
): Promise<{ success: boolean; response: string; proxyUsed?: string }> => {
  try {
    let selectedProxy: ProxyItem | null = null;
    
    // Tự động xoay vòng: Chọn ngẫu nhiên 1 proxy từ pool
    if (proxyConfig?.enabled && proxyConfig.pool.length > 0) {
      const randomIndex = Math.floor(Math.random() * proxyConfig.pool.length);
      selectedProxy = proxyConfig.pool[randomIndex];
    }

    const body = {
      serviceId,
      phone,
      proxyConfig: selectedProxy
    };

    const response = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const result = await response.json();
    const proxyStr = selectedProxy ? `${selectedProxy.host}:${selectedProxy.port}` : 'None';

    if (result.success) {
      return { 
        success: true, 
        response: result.proxyUsed ? `Gửi qua IP [${proxyStr}]` : "Gửi trực tiếp",
        proxyUsed: proxyStr
      };
    } else {
      return { 
        success: false, 
        response: result.message || result.error || `Lỗi ${result.status}`,
        proxyUsed: proxyStr
      };
    }
  } catch (error: any) {
    return { 
      success: false, 
      response: "Lỗi kết nối API" 
    };
  }
};
