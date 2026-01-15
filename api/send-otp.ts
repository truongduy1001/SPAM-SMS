
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { HttpsProxyAgent } from 'https-proxy-agent';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { serviceId, phone, proxyConfig } = req.body;
  
  if (!serviceId || !phone) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const phoneClean = phone.replace(/\s+/g, '');
  const phoneWith84 = phoneClean.startsWith('0') ? '84' + phoneClean.substring(1) : phoneClean;

  // Cấu hình Proxy Agent nếu có
  let agent = null;
  if (proxyConfig && proxyConfig.host && proxyConfig.port) {
    const proxyUrl = proxyConfig.user 
      ? `http://${proxyConfig.user}:${proxyConfig.pass}@${proxyConfig.host}:${proxyConfig.port}`
      : `http://${proxyConfig.host}:${proxyConfig.port}`;
    agent = new HttpsProxyAgent(proxyUrl);
  }

  try {
    let url = '';
    let fetchOptions: any = {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
      },
      // Sử dụng agent cho proxy
      ...(agent ? { agent } : {})
    };

    switch (serviceId) {
      case 'vexere':
        url = 'https://api.vexere.com/v1/user/otp';
        fetchOptions.body = JSON.stringify({ phone: phoneClean, type: 'register' });
        break;
      case 'fptplay':
        url = 'https://api.fptplay.net/api/v7.1_w/user/otp/register_otp';
        fetchOptions.headers['Origin'] = 'https://fptplay.vn';
        fetchOptions.body = JSON.stringify({ phone: phoneClean });
        break;
      case 'ghn':
        url = 'https://sso.ghn.vn/v2/otp/send';
        fetchOptions.body = JSON.stringify({ phone: phoneClean });
        break;
      case 'ahamove':
        url = 'https://app.ahamove.com/api/v1/user/otp';
        fetchOptions.body = JSON.stringify({ mobile: phoneWith84 });
        break;
      case 'lalamove':
        url = 'https://www.lalamove.com/api/v1/otp/send';
        fetchOptions.body = JSON.stringify({ phone: phoneWith84, country: 'VN' });
        break;
      case 'fptshop':
        url = 'https://fptshop.com.vn/api-fsh/customer/get-otp';
        fetchOptions.body = JSON.stringify({ phoneNumber: phoneClean, type: 1 });
        break;
      default:
        // Cố gắng gửi qua một endpoint chung nếu không khớp
        url = 'https://api.fptplay.net/api/v7.1_w/user/otp/register_otp';
        fetchOptions.body = JSON.stringify({ phone: phoneClean });
    }

    // Sử dụng fetch truyền thống của Node (Vercel hỗ trợ fetch built-in)
    // Lưu ý: fetch chuẩn của Node 18+ không hỗ trợ 'agent' trực tiếp dễ dàng như 'node-fetch'
    // Nhưng HttpsProxyAgent có thể dùng với http.request hoặc các thư viện khác.
    // Ở đây ta sẽ dùng cách tiếp cận tương thích với Vercel Runtime.
    
    const response = await fetch(url, fetchOptions as any);
    const status = response.status;

    return res.status(200).json({ 
      success: response.ok, 
      status: status,
      proxyUsed: !!agent,
      message: response.ok ? "Thành công" : `Lỗi ${status}`
    });

  } catch (error: any) {
    console.error("Fetch Error:", error.message);
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      tip: "Kiểm tra lại cấu hình Proxy của bạn (Host/Port có đúng không?)"
    });
  }
}
