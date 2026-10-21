import express from "express";
import {
    createCompany,
    getAllCompanies,
    getCompanyById,
    updateCompany,
    assignCompanyAdmin,
    getMyCompany,
    permanentDeleteCompany,
    deactivateCompany,
    activateCompany,
} from "../controllers/company.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authorize, checkSuperAdmin } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import { createCompanySchema, updateCompanySchema, assignAdminSchema, companyIdSchema } from "../validations/company.validator.js";

const router = express.Router();

router.get("/me", protect, getMyCompany);
router.post("/", protect, authorize("company", "canCreate"), validate(createCompanySchema), createCompany);
router.get("/", protect, authorize("company", "canView"), getAllCompanies);
router.get("/:id", protect, authorize("company", "canView"), validate(companyIdSchema, "params"), getCompanyById);
router.put("/:id", protect, authorize("company", "canEdit"), validate(companyIdSchema, "params"), validate(updateCompanySchema), updateCompany);
router.delete("/:id", protect, authorize("company", "canDelete"), validate(companyIdSchema, "params"), deactivateCompany);
router.delete("/:id/permanent", protect, checkSuperAdmin, validate(companyIdSchema, "params"), permanentDeleteCompany);
router.patch("/:id/activate", protect, checkSuperAdmin, validate(companyIdSchema, "params"), activateCompany);

// assign company admin 
router.post("/:id/assign-admin", protect, authorize("company", "canCreate"), validate(companyIdSchema, "params"), validate(assignAdminSchema), assignCompanyAdmin);
// get my company

export default router;