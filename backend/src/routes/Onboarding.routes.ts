import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
    startOnboarding,
    getOnboardingList,
    getOnboardingDetail,
    toggleChecklistItem,
    setStageManually,
    setOnboardingStatus,
    resetEmployeeOnboarding,
    submitChecklistDocumentController
} from "../controllers/Onboarding.controller.js";

const router = Router();

router.get("/", protect, getOnboardingList);
router.post("/start/:userId", protect, startOnboarding);
router.get("/:userId", protect, getOnboardingDetail);
router.patch("/:userId/stage", protect, setStageManually);
router.patch("/:userId/status", protect, setOnboardingStatus);
router.patch("/item/:itemId/toggle", protect, toggleChecklistItem);
router.delete("/:userId/reset", protect, resetEmployeeOnboarding);
router.post("/checklist/:itemId/submit-document", protect, submitChecklistDocumentController);

export default router;

// index.ts mein:
// import onboardingRoutes from "./routes/onboarding.routes.js";
// app.use("/api/onboarding", onboardingRoutes);