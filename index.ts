import {
  DoorbellCamera,
  EufySecurity,
  EufySecurityConfig,
  Logger,
} from 'eufy-security-client';
import TelegramBot from 'node-telegram-bot-api';
import 'dotenv/config';

const config: EufySecurityConfig = {
  country: 'nl',
  username: getEnv('username'),
  password: getEnv('password'),
};
const botApiKey = getEnv('botApiKey');
const botChatId = Number(getEnv('botChatId'));
const bot = new TelegramBot(botApiKey, { polling: true });

try {
  main();
} catch (e) {
  console.error(e);
}

async function main() {
  const eufy = await initEufy();
  const devices = await eufy.getDevices();
  const doorbell = devices[0] as DoorbellCamera;
  logDoorbell(doorbell);
  setDoorbellEventHandlers(doorbell);
}

async function initEufy() {
  console.log('Init eufy');
  const eufy = await EufySecurity.initialize(config, createLogger());
  await eufy.connect();
  await eufy.refreshCloudData();
  return eufy;
}

function setDoorbellEventHandlers(doorbell: DoorbellCamera) {
  doorbell.on('motion detected', (_value, property) =>
    console.log('motion detected:', property)
  );
  doorbell.on('rings', (device, detected) => {
    console.log('ringing Detected:', detected, device);
    if (detected) {
      sendMessage(`Ringing`);
    }
  });
  doorbell.on('property changed', (value, property) => {
    console.log('property:', property);
    if (property === 'picture') {
      const pictureBuffer = value.getPropertyValue('picture').data;
      bot.sendPhoto(botChatId, pictureBuffer);
      console.log('Send picture');
    }
  });
  bot.on('message', (msg) => {
    console.log(`Received message: ${msg.text} from ${msg.chat.id}`);
    sendMessage(`${msg.from?.first_name} said: ${msg.text}`);
  });
}

function logDoorbell(doorbell: DoorbellCamera) {
  console.log('doorbell:', doorbell.isCamera(), doorbell.isDoorbell());
  console.log('isRinging:', doorbell.isRinging());
  console.log('motion detected1:', doorbell.isMotionDetected());
  console.log('image url', doorbell.getLastCameraImageURL());
  console.log('mac address', doorbell.getMACAddress());
  console.log('device name', doorbell.getName());
}

async function sendMessage(message: string) {
  try {
    await bot.sendMessage(botChatId, message);
    console.log('Message sent successfully', message);
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

function createLogger(): Logger {
  return {
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
}

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing environment variable ${key}`);
  return value;
}
