
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { serviceId, phone } = req.body;
  if (!serviceId || !phone) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  phone = phone.replace(/\s+/g, '');
  const phoneNoZero = phone.startsWith('0') ? phone.substring(1) : phone;
  const phoneWith84 = phone.startsWith('0') ? '84' + phone.substring(1) : phone;

  try {
    let url = '';
    let options: any = {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
      }
    };

    switch (serviceId) {
      case 'vexere':
        url = 'https://api.vexere.com/v1/user/otp';
        options.body = JSON.stringify({ phone: phone, type: 'register' });
        break;

      case 'fptplay':
        url = 'https://api.fptplay.net/api/v7.1_w/user/otp/register_otp';
        options.headers['Origin'] = 'https://fptplay.vn';
        options.headers['Referer'] = 'https://fptplay.vn/';
        options.body = JSON.stringify({ phone: phone });
        break;

      case 'ghn':
        url = 'https://sso.ghn.vn/v2/otp/send';
        options.body = JSON.stringify({ phone: phone });
        break;

      case 'sapo':
        url = 'https://www.sapo.vn/fnb/sendotp';
        options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        options.body = `phone=${phone}`;
        break;

      case 'fptshop':
        url = 'https://fptshop.com.vn/api-fsh/customer/get-otp';
        options.body = JSON.stringify({ phoneNumber: phone, type: 1 });
        break;

      case 'ahamove':
        url = 'https://app.ahamove.com/api/v1/user/otp';
        options.body = JSON.stringify({ mobile: phoneWith84 });
        break;

      case 'tiki':
        url = 'https://tiki.vn/api/v2/otp/send';
        options.headers['Referer'] = 'https://tiki.vn/';
        options.body = JSON.stringify({ phone_number: phone });
        break;

      default:
        return res.status(404).json({ success: false, error: 'Service not found' });
    }

    const apiRes = await fetch(url, options);
    const status = apiRes.status;
    const responseText = await apiRes.text();

    // Trả về mã lỗi thực tế để UI hiển thị cho người dùng biết
    return res.status(200).json({ 
      success: apiRes.ok, 
      status: status,
      message: status === 403 ? "IP Vercel bị dịch vụ chặn (403)" : status === 429 ? "Bị giới hạn tốc độ (429)" : "Phản hồi từ Server"
    });

  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
