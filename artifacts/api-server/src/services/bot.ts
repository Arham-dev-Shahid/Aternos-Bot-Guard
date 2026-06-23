import mineflayer from "mineflayer";
import { logger } from "../lib/logger";

export interface BotConfig {
  host: string;
  port?: number;
  username: string;
  version?: string | null;
}

export interface BotStatus {
  connected: boolean;
  connecting: boolean;
  host: string | null;
  port: number | null;
  username: string | null;
  version: string | null;
  reconnectCount: number;
  uptime: number | null;
  lastError: string | null;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

const MAX_LOGS = 200;
const RECONNECT_DELAY_MS = 5000;

let bot: ReturnType<typeof mineflayer.createBot> | null = null;
let currentConfig: BotConfig | null = null;
let connected = false;
let connecting = false;
let reconnectCount = 0;
let connectedAt: number | null = null;
let lastError: string | null = null;
let shouldReconnect = false;
let reconnectTimer: NodeJS.Timeout | null = null;

const logs: LogEntry[] = [];

function addLog(level: string, message: string) {
  logs.push({ timestamp: new Date().toISOString(), level, message });
  if (logs.length > MAX_LOGS) {
    logs.splice(0, logs.length - MAX_LOGS);
  }
  logger.info({ level, message }, "bot log");
}

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function destroyBot() {
  if (bot) {
    try {
      bot.removeAllListeners();
      bot.quit("Disconnecting");
    } catch {
      // ignore
    }
    bot = null;
  }
  connected = false;
  connecting = false;
  connectedAt = null;
}

function scheduleReconnect() {
  if (!shouldReconnect || !currentConfig) return;
  clearReconnectTimer();
  addLog("info", `Reconnecting in ${RECONNECT_DELAY_MS / 1000}s... (attempt ${reconnectCount + 1})`);
  reconnectTimer = setTimeout(() => {
    if (shouldReconnect && currentConfig) {
      spawnBot(currentConfig);
    }
  }, RECONNECT_DELAY_MS);
}

function spawnBot(config: BotConfig) {
  destroyBot();
  connecting = true;

  addLog("info", `Connecting to ${config.host}:${config.port ?? 25565} as ${config.username}...`);

  const botOptions: Parameters<typeof mineflayer.createBot>[0] = {
    host: config.host,
    port: config.port ?? 25565,
    username: config.username,
    auth: "offline",
    hideErrors: false,
  };

  if (config.version) {
    botOptions.version = config.version;
  }

  bot = mineflayer.createBot(botOptions);

  bot.on("login", () => {
    connected = true;
    connecting = false;
    connectedAt = Date.now();
    addLog("info", `Logged in as ${bot?.username ?? config.username} on ${config.host}`);
  });

  bot.on("spawn", () => {
    addLog("info", "Bot spawned in world");
  });

  bot.on("kicked", (reason: string) => {
    lastError = `Kicked: ${reason}`;
    addLog("warn", `Kicked from server: ${reason}`);
    destroyBot();
    reconnectCount++;
    scheduleReconnect();
  });

  bot.on("error", (err: Error) => {
    lastError = err.message;
    addLog("error", `Error: ${err.message}`);
  });

  bot.on("end", (reason: string) => {
    if (connected || connecting) {
      addLog("warn", `Disconnected: ${reason ?? "unknown"}`);
    }
    destroyBot();
    reconnectCount++;
    scheduleReconnect();
  });

  bot.on("message", (jsonMsg: { toString: () => string }) => {
    const text = jsonMsg.toString();
    if (text) {
      addLog("info", `[chat] ${text}`);
    }
  });
}

export function connectBot(config: BotConfig): BotStatus {
  shouldReconnect = true;
  reconnectCount = 0;
  lastError = null;
  currentConfig = config;
  clearReconnectTimer();
  logs.length = 0;
  spawnBot(config);
  return getStatus();
}

export function disconnectBot(): BotStatus {
  shouldReconnect = false;
  clearReconnectTimer();
  addLog("info", "Disconnecting bot...");
  destroyBot();
  currentConfig = null;
  reconnectCount = 0;
  lastError = null;
  return getStatus();
}

export function getStatus(): BotStatus {
  return {
    connected,
    connecting,
    host: currentConfig?.host ?? null,
    port: currentConfig?.port ?? null,
    username: currentConfig?.username ?? null,
    version: currentConfig?.version ?? null,
    reconnectCount,
    uptime: connectedAt ? Math.floor((Date.now() - connectedAt) / 1000) : null,
    lastError,
  };
}

export function getLogs(): LogEntry[] {
  return [...logs];
}
