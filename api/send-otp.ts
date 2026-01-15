
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { serviceId, phone } = req.body;

  if (!serviceId || !phone) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  // Chuẩn hóa số điện thoại: Loại bỏ khoảng trắng
  phone = phone.replace(/\s+/g, '');
  
  // Một số dịch vụ cần bỏ số 0 đầu, một số cần giữ. Chúng ta sẽ xử lý theo từng case.
  const phoneNoZero = phone.startsWith('0') ? phone.substring(1) : phone;
  const phoneWith84 = phone.startsWith('0') ? '84' + phone.substring(1) : phone;

  try {
    let url = '';
    let options: any = {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    };

    switch (serviceId) {
      case 'sapo':
        url = 'https://www.sapo.vn/fnb/sendotp';
        options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        options.headers['Origin'] = 'https://www.sapo.vn';
        options.headers['Referer'] = 'https://www.sapo.vn/';
        options.body = `phone=${phone}`;
        break;

      case 'viettel':
        url = 'https://viettel.vn/api/getOTPLoginCommon';
        options.headers['Content-Type'] = 'application/json';
        options.headers['Origin'] = 'https://viettel.vn';
        options.headers['Referer'] = 'https://viettel.vn/';
        options.body = JSON.stringify({ phoneNumber: phone, type: 1 });
        break;

      case 'fptplay':
        url = 'https://api.fptplay.net/api/v7.1_w/user/otp/register_otp';
        options.headers['Content-Type'] = 'application/json';
        options.headers['Origin'] = 'https://fptplay.vn';
        options.headers['Referer'] = 'https://fptplay.vn/';
        options.body = JSON.stringify({ phone: phone });
        break;

      case 'tiki':
        url = 'https://tiki.vn/api/v2/otp/send';
        options.headers['Content-Type'] = 'application/json';
        options.headers['Referer'] = 'https://tiki.vn/';
        options.body = JSON.stringify({ phone_number: phone });
        break;

      case 'ghn':
        url = 'https://sso.ghn.vn/v2/otp/send';
        options.headers['Content-Type'] = 'application/json';
        options.headers['Referer'] = 'https://sso.ghn.vn/';
        options.body = JSON.stringify({ phone: phone });
        break;

      case 'ahamove':
        url = 'https://app.ahamove.com/api/v1/user/otp';
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify({ mobile: phoneWith84 });
        break;

      default:
        // Fallback thành công giả lập để UI không bị treo
        return res.status(200).json({ success: true, message: 'Service not implemented yet but skipped gracefully' });
    }

    const apiRes = await fetch(url, options);
    const data = await apiRes.text();

    // Log sơ bộ kết quả để debug trên Vercel
    console.log(`Service ${serviceId} returned: ${apiRes.status}`);

    return res.status(200).json({ 
      success: apiRes.ok, 
      status: apiRes.status,
      data: data.length > 100 ? data.substring(0, 100) + '...' : data 
    });

  } catch (error: any) {
    console.error(`Proxy Error for ${serviceId}:`, error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
