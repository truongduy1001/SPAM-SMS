
import { ServiceDefinition } from '../types';

export const OTP_SERVICES: ServiceDefinition[] = [
  { id: 'vexere', name: 'Vexere.com', category: 'Retail', status: 'Idle' },
  { id: 'fptplay', name: 'FPT Play', category: 'Media', status: 'Idle' },
  { id: 'ghn', name: 'GHN Express', category: 'Retail', status: 'Idle' },
  { id: 'sapo', name: 'Sapo.vn', category: 'Retail', status: 'Idle' },
  { id: 'fptshop', name: 'FPT Shop', category: 'Retail', status: 'Idle' },
  { id: 'ahamove', name: 'Ahamove', category: 'Retail', status: 'Idle' },
  { id: 'tiki', name: 'Tiki VN', category: 'Retail', status: 'Idle' },
];

export const triggerOTP = async (serviceId: string, phone: string): Promise<{ success: boolean; response: string }> => {
  try {
    const response = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceId, phone })
    });

    const result = await response.json();

    if (result.success) {
      return { success: true, response: "Đã gửi yêu cầu" };
    } else {
      return { success: false, response: result.message || `Lỗi ${result.status}` };
    }
  } catch (error: any) {
    return { 
      success: false, 
      response: "Lỗi kết nối Proxy" 
    };
  }
};
