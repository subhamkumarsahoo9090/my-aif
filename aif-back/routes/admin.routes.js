import { Router } from "express";
import * as admin from "../controllers/admin.controller.js";

const router = Router();

router.post("/login", admin.login);
router.get("/session", admin.session);
router.get("/access", admin.access);
router.get("/overview", admin.overview);
router.get("/command", admin.command);
router.get("/clients", admin.clients);
router.post("/clients", admin.createClient);
router.get("/clients/:code", admin.client);
router.patch("/clients/:code", admin.updateClient);
router.post("/clients/:code/password", admin.resetClientPassword);
router.post("/clients/:code/holdings/nav", admin.updateHoldingNav);
router.get("/staff", admin.staff);
router.post("/staff", admin.createStaff);
router.patch("/staff/:id", admin.updateStaff);
router.get("/roles", admin.roles);
router.put("/roles", admin.saveRoles);
router.get("/imports", admin.imports);
router.post("/imports", admin.importFile);
router.get("/holdings", admin.holdingRows);
router.post("/holdings", admin.holdingAction);
router.get("/ledger", admin.ledgerRows);
router.post("/ledger", admin.ledgerAction);
router.get("/reports", admin.reports);
router.post("/reports", admin.createReport);
router.get("/reports/:code/file", admin.reportFile);
router.get("/nav", admin.navHistory);
router.post("/nav", admin.addNav);
router.get("/audit", admin.audit);
router.get("/platform", admin.platform);
router.post("/platform", admin.platformAction);
router.get("/ifsc/:code", admin.ifsc);

export default router;
