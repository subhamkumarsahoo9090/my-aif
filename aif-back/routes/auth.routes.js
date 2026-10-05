import { Router } from "express";
import * as auth from "../controllers/auth.controller.js";

const router = Router();

router.post("/login", auth.login);
router.get("/accounts", auth.accounts);
router.delete("/accounts", auth.deleteAccount);
router.post("/logout", auth.logout);
router.get("/session", auth.session);
router.post("/forgot", auth.forgot);
router.post("/verify-otp", auth.verifyOtp);
router.post("/reset", auth.resetPassword);

export default router;
