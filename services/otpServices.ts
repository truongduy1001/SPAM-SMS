
import { ServiceDefinition } from '../types';

export const OTP_SERVICES: ServiceDefinition[] = [
  { id: 'sapo', name: 'Sapo OTP', category: 'Retail', status: 'Idle' },
  { id: 'viettel', name: 'Viettel Login', category: 'Telco', status: 'Idle' },
  { id: 'fptplay', name: 'FPT Play', category: 'Media', status: 'Idle' },
  { id: 'shopee', name: 'Shopee VN', category: 'Retail', status: 'Idle' },
  { id: 'tiki', name: 'Tiki VN', category: 'Retail', status: 'Idle' },
  { id: 'vnpay', name: 'VNPay', category: 'Finance', status: 'Idle' },
  { id: 'ghn', name: 'GHN Express', category: 'Retail', status: 'Idle' },
  { id: 'ahamove', name: 'Ahamove', category: 'Retail', status: 'Idle' },
];

export const triggerOTP = async (serviceId: string, phone: string): Promise<{ success: boolean; response: string }> => {
  try {
    // Gọi đến API Proxy trên Vercel
    const response = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceId, phone })
    });

    const result = await response.json();

    if (result.success) {
      return { success: true, response: "OK" };
    } else {
      return { success: false, response: `Lỗi Server: ${result.status || 'Unknown'}` };
    }
  } catch (error: any) {
    console.error(`Error calling proxy for ${serviceId}:`, error);
    return { 
      success: false, 
      response: "Network Error: Kiểm tra kết nối Internet hoặc Server API." 
    };
  }
};
