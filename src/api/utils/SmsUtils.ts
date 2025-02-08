const fs = require('fs');
const handlebars = require('handlebars');

// Configure SMS variables
const {
  SMS_TWILIO_ACCOUNT_SID,
  SMS_TWILIO_AUTH_TOKEN,
  SMS_TWILIO_PHONE_NUMBER,
  SMS_TEMPLATE_BASE
} = require('../../config/vars');

// Initialize Twilio client
const twilio = require('twilio');
let smsClient: any = null;
if (SMS_TWILIO_ACCOUNT_SID && SMS_TWILIO_AUTH_TOKEN) {
  smsClient = twilio(SMS_TWILIO_ACCOUNT_SID, SMS_TWILIO_AUTH_TOKEN);
}

// Load SMS template file & inject data => return content with injected data
const smsTemplate = (fileName: string, data: any) => {
  const content = fs.readFileSync(SMS_TEMPLATE_BASE + fileName).toString();
  const inject = handlebars.compile(content);
  return inject(data);
};

// SMS Template Functions
export function welcomeSms({ name, phone }: { name: string; phone: string }) {
  return {
    from: SMS_TWILIO_PHONE_NUMBER,
    to: phone,
    body: smsTemplate('welcome.txt', { name })
  };
}

export function forgotPasswordSms({ name, phone, tempPass }: { name: string; phone: string; tempPass: string }) {
  return {
    from: SMS_TWILIO_PHONE_NUMBER,
    to: phone,
    body: smsTemplate('forgot-password.txt', { name, tempPass })
  };
}

export function loginSms({ name, phone, loginTime }: { name: string; phone: string; loginTime: string }) {
  return {
    from: SMS_TWILIO_PHONE_NUMBER,
    to: phone,
    body: smsTemplate('login-alert.txt', { name, loginTime })
  };
}

export function sendSms(data: any) {
  if (!smsClient) {
    return Promise.reject(new Error('SMS client not configured'));
  }

  return new Promise((resolve, reject) => {
    smsClient.messages
      .create(data)
      .then((message: any) => resolve(message))
      .catch((err: any) => reject(err));
  });
}

// Optional: SMS Verification Code Generator
export function generateVerificationCode(length: number = 6): string {
  return Math.floor(100000 + Math.random() * 900000)
    .toString()
    .substring(0, length);
}

// Optional: Send Verification SMS
export function sendVerificationSms({ phone, code }: { phone: string; code: string }) {
  return {
    from: SMS_TWILIO_PHONE_NUMBER,
    to: phone,
    body: smsTemplate('verification-code.txt', { code })
  };
}