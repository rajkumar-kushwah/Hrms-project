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
    submitChecklistDocumentController,
    uploadOnboardingDocument,
    handleOnboardingUploadError
} from "../controllers/Onboarding.controller.js";
import onboardingUpload from "../middleware/onboardingUpload.middleware.js";

const router = Router();

router.get("/", protect, getOnboardingList);
router.post("/start/:userId", protect, startOnboarding);
router.get("/:userId", protect, getOnboardingDetail);
router.patch("/:userId/stage", protect, setStageManually);
router.patch("/:userId/status", protect, setOnboardingStatus);
router.patch("/item/:itemId/toggle", protect, toggleChecklistItem);
router.delete("/:userId/reset", protect, resetEmployeeOnboarding);
router.post("/checklist/:itemId/submit-document", protect, submitChecklistDocumentController);
router.post(
    "/:itemId/upload-document",
    protect,
    onboardingUpload.single("file"),
    uploadOnboardingDocument,
    handleOnboardingUploadError
);


export default router;

// index.ts mein:
// import onboardingRoutes from "./routes/onboarding.routes.js";
// app.use("/api/onboarding", onboardingRoutes);