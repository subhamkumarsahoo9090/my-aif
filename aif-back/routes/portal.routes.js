import { Router } from "express";
import * as portal from "../controllers/portal.controller.js";

const router = Router();

router.get("/summary", portal.summary);
router.get("/profile", portal.profile);
router.get("/holdings", portal.holdings);
router.get("/ledger", portal.ledger);
router.get("/statements", portal.statements);
router.get("/statements/:id", portal.statementFile);

export default router;
