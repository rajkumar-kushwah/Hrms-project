import type { Request, Response } from "express";
import { ZipArchive } from "archiver";
import { prisma } from "../config/db.js";
import { getEmployeePayrollDetail } from "../services/payroll.service.js";
import { generateSalarySlipHTML } from "../services/Salarysliptemplate.js";
import { generatePdfFromHtml } from "../services/Pdfservice.js";
import { getCompanyId } from "../utilis/roleUtils.js";
// ─────────────────────────────────────────────────────────────
// POST /api/payroll/salary-slips/bulk
// Body: { userIds: string[], month: number, year: number }
// ─────────────────────────────────────────────────────────────
// Generates one PDF per employee and streams them back as a
// single ZIP file. If a specific employee's slip fails to
// generate (e.g. inactive, no salary set), that employee is
// skipped and reported in a manifest file inside the zip,
// rather than failing the whole batch.
// ─────────────────────────────────────────────────────────────

export const downloadBulkSalarySlips = async (
    req: Request,
    res: Response
) => {
    try {
        const { userIds, month, year } = req.body as {
            userIds: string[];
            month: number;
            year: number;
        };

        const companyId = getCompanyId(req); // adjust to your auth context

        if (!companyId) {
            return res.status(400).json({
                message: "Company ID is required",
            });
        }

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                message: "At least one employee must be selected",
            });
        }

        if (!month || !year) {
            return res.status(400).json({
                message: "Month and year are required",
            });
        }

        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: {
                name: true,
                address: true,
            },
        });

        if (!company) {
            return res.status(404).json({
                message: "Company not found",
            });
        }

        // ─────────────────────────────────────
        // Set up ZIP stream response
        // ─────────────────────────────────────

        const zipFileName = `salary-slips-${month}-${year}.zip`;

        res.setHeader("Content-Type", "application/zip");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${zipFileName}"`
        );

        const archive = new ZipArchive({
            zlib: { level: 9 },
        });

        archive.pipe(res);

        const failures: { userId: string; reason: string }[] = [];

        // ─────────────────────────────────────
        // Generate each slip, add to zip
        // ─────────────────────────────────────

        for (const userId of userIds) {
            try {
                const payrollDetail = await getEmployeePayrollDetail(
                    userId,
                    companyId,
                    Number(month),
                    Number(year)
                );

                const html = generateSalarySlipHTML(payrollDetail, {
                    name: company.name || "company",
                    address: company.address || "company address",
                });

                const pdfBuffer = await generatePdfFromHtml(html);

                const entryName = `${payrollDetail.user.employeeCode ?? userId}-${payrollDetail.user.name}.pdf`;

                archive.append(pdfBuffer, { name: entryName });
            } catch (err: any) {
                failures.push({
                    userId,
                    reason: err.message || "Unknown error",
                });
            }
        }

        // Include a manifest of any skipped employees, so the
        // admin knows why someone's slip is missing from the zip.
        if (failures.length > 0) {
            archive.append(
                JSON.stringify(failures, null, 2),
                { name: "_failed-slips.json" }
            );
        }

        await archive.finalize();
    } catch (error: any) {
        console.error("Bulk salary slip generation failed:", error);

        // Note: if headers are already sent (streaming started),
        // we can't send a JSON error anymore — this only fires
        // for early failures before streaming begins.
        if (!res.headersSent) {
            return res.status(500).json({
                message: error.message || "Failed to generate salary slips",
            });
        }
    }
};