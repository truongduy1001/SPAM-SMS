
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { serviceId, phone } = req.body;

  if (!serviceId || !phone) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    let response;
    let url = '';
    let options: any = {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    };

    switch (serviceId) {
      case 'sapo':
        url = 'https://www.sapo.vn/fnb/sendotp';
        options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        options.body = `phone=${phone}`;
        break;
      case 'viettel':
        url = 'https://viettel.vn/api/getOTPLoginCommon';
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify({ phoneNumber: phone, type: 1 });
        break;
      case 'fptplay':
        url = 'https://api.fptplay.net/api/v7.1_w/user/otp/register_otp';
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify({ phone: phone });
        break;
      case 'shopee':
        url = 'https://shopee.vn/api/v2/authentication/gen_otp';
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify({ phone: phone, type: 1 });
        break;
      default:
        // Mock success cho các dịch vụ khác nếu chưa update endpoint
        return res.status(200).json({ success: true, message: 'Mock Success' });
    }

    const apiRes = await fetch(url, options);
    const data = await apiRes.text();

    return res.status(200).json({ 
      success: apiRes.ok, 
      data: data,
      status: apiRes.status 
    });

  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
