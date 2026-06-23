import { Router } from "express";
import { connectBot, disconnectBot, getStatus, getLogs } from "../services/bot";
import { ConnectBotBody } from "@workspace/api-zod";

const router = Router();

router.get("/bot/status", (_req, res) => {
  res.json(getStatus());
});

router.post("/bot/connect", (req, res) => {
  const parsed = ConnectBotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const status = connectBot(parsed.data);
  res.json(status);
});

router.post("/bot/disconnect", (_req, res) => {
  const status = disconnectBot();
  res.json(status);
});

router.get("/bot/logs", (_req, res) => {
  res.json(getLogs());
});

export default router;
