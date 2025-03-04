import {
  DoorbellCamera,
  EufySecurity,
  EufySecurityConfig,
  Logger,
} from 'eufy-security-client';
import TelegramBot from 'node-telegram-bot-api';
import 'dotenv/config';

console.log('start eufy');

const config: EufySecurityConfig = {
  country: 'nl',
  username: getEnv('username'),
  password: getEnv('password'),
};

const botApiKey = getEnv('botApiKey');
const botChatId = Number(getEnv('botChatId'));

const logger: Logger = {
  trace: (message: unknown, ...args: unknown[]) =>
    console.log(new Date().toLocaleTimeString(), message, args),
  debug: (message: unknown, ...args: unknown[]) =>
    console.log(new Date().toLocaleTimeString(), message, args),
  info: (message: unknown, ...args: unknown[]) =>
    console.log(new Date().toLocaleTimeString(), message, args),
  warn: (message: unknown, ...args: unknown[]) =>
    console.log(new Date().toLocaleTimeString(), message, args),
  error: (message: unknown, ...args: unknown[]) =>
    console.log(new Date().toLocaleTimeString(), message, args),
};

const bot = new TelegramBot(botApiKey, { polling: true });

bot.on('message', (msg) => {
  console.log(`Received message: ${msg.text} from ${msg.chat.id}`);
  sendMessage(`${msg.from?.first_name} said: ${msg.text}`);
});

async function main() {
  const eufy = await EufySecurity.initialize(config, logger);
  await eufy.connect();
  await eufy.refreshCloudData();
  const devices = await eufy.getDevices();
  const doorbell = devices[0] as DoorbellCamera;
  console.log('doorbell:', doorbell.isCamera(), doorbell.isDoorbell());
  console.log('isRinging:', doorbell.isRinging());
  console.log('motion detected1:', doorbell.isMotionDetected());
  console.log('image url', doorbell.getLastCameraImageURL());
  console.log('mac address', doorbell.getMACAddress());
  console.log('device name', doorbell.getName());
  doorbell.on('motion detected', (_value, property) => {
    console.log('motion detected:', property);
  });
  doorbell.on('rings', (device, detected) => {
    console.log('ringing Detected:', detected, device);
    sendMessage(`Ringing ${detected ? 'Yes' : 'No'}`);
  });
  doorbell.on('property changed', (value, property) => {
    console.log('property:', property);
    if (property === 'picture') {
      const pictureBuffer = value.getPropertyValue('picture').data;
      bot.sendPhoto(botChatId, pictureBuffer);
      console.log('send picture');
    }
  });
}

try {
  main();
} catch (e) {
  console.error(e);
}

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing environment variable ${key}`);
  return value;
}

async function sendMessage(message: string) {
  try {
    await bot.sendMessage(botChatId, message);
    console.log('Message sent successfully', message);
  } catch (error) {
    console.error('Error sending message:', error);
  }
}
