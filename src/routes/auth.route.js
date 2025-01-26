import express from "express";
import {
  getSession,
  googleAuth,
  googleCallback,
  handleLogout,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.get("/google", googleAuth);

router.get("/callback/google", googleCallback);

router.get("/session", getSession);

router.post("/signout", handleLogout);

export const authRoutes = router;
