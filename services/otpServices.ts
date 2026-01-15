
import { ServiceDefinition, ProxyConfig } from '../types';

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
  proxy?: ProxyConfig
): Promise<{ success: boolean; response: string }> => {
  try {
    const body = {
      serviceId,
      phone,
      proxyConfig: proxy?.enabled ? {
        host: proxy.host,
        port: proxy.port,
        user: proxy.user,
        pass: proxy.pass
      } : null
    };

    const response = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const result = await response.json();

    if (result.success) {
      return { success: true, response: result.proxyUsed ? "Gửi qua Proxy thành công" : "Gửi trực tiếp thành công" };
    } else {
      return { success: false, response: result.message || result.error || `Lỗi ${result.status}` };
    }
  } catch (error: any) {
    return { 
      success: false, 
      response: "Lỗi kết nối API" 
    };
  }
};
