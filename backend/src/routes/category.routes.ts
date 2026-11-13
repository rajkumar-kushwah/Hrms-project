import { Router } from "express";
import {
    createCategory,
    getCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
    permanentDeleteCategory,
} from "../controllers/category.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authorize, checkSuperAdmin } from "../middleware/role.middleware.js";
import { MODULES } from "../utilis/moduleUtils.js";

const router = Router();
router.get("/", protect, authorize(MODULES.CATEGORY, "canView"), getCategories);

router.get("/:id", protect, authorize(MODULES.CATEGORY, "canView"), getCategoryById);

router.post("/", protect, authorize(MODULES.CATEGORY, "canCreate"), createCategory);

router.put("/:id", protect, authorize(MODULES.CATEGORY, "canEdit"), updateCategory);

router.delete("/:id", protect, authorize(MODULES.CATEGORY, "canDelete"), deleteCategory);

router.delete("/:id/permanent", protect, checkSuperAdmin, permanentDeleteCategory);



export default router;