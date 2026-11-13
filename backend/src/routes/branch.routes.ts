import { Router } from "express";
import {
    createBranch,
    getBranches,
    getBranchById,
    updateBranch,
    deleteBranch,
    permanentDeleteBranch,
    getGeoFencingOverview,
} from "../controllers/branch.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authorize, checkSuperAdmin } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import { createBranchSchema, branchIdSchema, updateBranchSchema } from "../validations/branch.validator.js";
import { MODULES } from "../utilis/moduleUtils.js";

const router = Router();
router.get("/", protect, authorize(MODULES.BRANCH, "canView"), getBranches);

router.get(
    "/geo-fencing/overview",
    protect,
    authorize(MODULES.GEO_FENCING, "canView"),
    getGeoFencingOverview
);

router.get(
    "/:id",
    protect,
    authorize(MODULES.BRANCH, "canView"),
    validate(branchIdSchema, "params"),
    getBranchById
);

router.post(
    "/",
    protect,
    authorize(MODULES.BRANCH, "canCreate"),
    validate(createBranchSchema),
    createBranch
);

router.put(
    "/:id",
    protect,
    authorize(MODULES.BRANCH, "canEdit"),
    validate(branchIdSchema, "params"),
    validate(updateBranchSchema),
    updateBranch
);

router.delete(
    "/:id",
    protect,
    authorize(MODULES.BRANCH, "canDelete"),
    validate(branchIdSchema, "params"),
    deleteBranch
);

router.delete(
    "/:id/permanent",
    protect,
    checkSuperAdmin,
    validate(branchIdSchema, "params"),
    permanentDeleteBranch
);

export default router;