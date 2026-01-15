
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch from 'node-fetch';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { serviceId, phone, proxyConfig } = req.body;
  
  if (!serviceId || !phone) {
    return res.status(400).json({ error: 'Thiếu tham số (phone hoặc serviceId)' });
  }

  const phoneClean = phone.replace(/\s+/g, '');
  const phoneWith84 = phoneClean.startsWith('0') ? '84' + phoneClean.substring(1) : phoneClean;

  let agent = null;
  if (proxyConfig && proxyConfig.host) {
    const { host, port, user, pass } = proxyConfig;
    // Sử dụng định dạng chuẩn cho Proxy Auth
    const proxyUrl = user && pass 
      ? `http://${user}:${pass}@${host}:${port}`
      : `http://${host}:${port}`;
    
    try {
      agent = new HttpsProxyAgent(proxyUrl);
      console.log(`[PROXY] Using: ${host}:${port}`);
    } catch (e) {
      console.error("[PROXY ERROR] Agent init failed:", e);
    }
  }

  try {
    let url = '';
    let bodyData: any = {};
    let headers: any = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Referer': 'https://google.com',
      'Origin': 'https://google.com'
    };

    // Định nghĩa các dịch vụ OTP (Cập nhật endpoint mới nhất)
    switch (serviceId) {
      case 'vexere':
        url = 'https://api.vexere.com/v1/user/otp';
        bodyData = { phone: phoneClean, type: 'register' };
        break;
      case 'fptplay':
        url = 'https://api.fptplay.net/api/v7.1_w/user/otp/register_otp';
        bodyData = { phone: phoneClean };
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
        bodyData = { phone: phoneClean };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s cho Proxy

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
    let resJson = {};
    try { resJson = JSON.parse(resText); } catch(e) {}

    if (response.ok) {
      return res.status(200).json({ 
        success: true, 
        message: "Gửi thành công",
        debug: resJson
      });
    } else {
      return res.status(status).json({ 
        success: false, 
        message: `Dịch vụ từ chối (${status})`,
        error: resText
      });
    }

  } catch (error: any) {
    let friendlyMessage = "Lỗi kết nối mạng";
    
    if (error.name === 'AbortError') friendlyMessage = "Proxy quá chậm (Timeout 15s)";
    else if (error.code === 'ECONNREFUSED') friendlyMessage = "Proxy chết hoặc sai Port";
    else if (error.code === 'EPROTO') friendlyMessage = "Lỗi giao thức Proxy (Sai IP/Auth)";
    else if (error.message.includes('407')) friendlyMessage = "Proxy sai Tài khoản/Mật khẩu";
    
    console.error(`[API ERROR] ${error.message}`);

    return res.status(200).json({ 
      success: false, 
      message: friendlyMessage,
      error: error.message
    });
  }
}
