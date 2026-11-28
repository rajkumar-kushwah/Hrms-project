
import {
  Prisma,
  EmployeeUpgradeType,
  EmployeeUpgradeStatus,
  UpgradeApprovalStatus,
  EmploymentStatus,
} from "@prisma/client";

import { prisma } from "../config/db.js";

import {
  isSuperAdminRole,
  isCompanyAdminRole,
  isHRRole,
  getRoleName,
} from "../utilis/roleUtils.js";

// ======================================================
// TYPES
// ======================================================

export interface UpgradeData {
  designation?: string | null;
  categoryId?: string | null;
  grossSalary?: number | null;
}

export interface CreateUpgradeInput {
  companyId: string;
  employeeId: string;
  requestedById: string;
  upgradeType: EmployeeUpgradeType;
  proposedData: UpgradeData;
  effectiveDate: Date;
  reason: string;
  remarks?: string | null;
}

export interface UpgradeListFilters {
  status?: EmployeeUpgradeStatus;
  employeeId?: string;
  search?: string;
  page?: number;
  limit?: number;
  approverId?: string;
  approvalView?: "PENDING" | "COMPLETED";
}
export interface ResubmitUpgradeInput {
  upgradeId: string;
  companyId: string;
  requestedById: string;
  proposedData: UpgradeData;
  effectiveDate: Date;
  reason: string;
  remarks?: string | null;
}


export type ApprovalAction =
  | "APPROVE"
  | "REJECT"
  | "SEND_BACK";

export interface ApprovalActionInput {
  upgradeId: string;
  companyId: string;
  approverId: string;
  action: ApprovalAction;
  comments?: string | null;
}

interface ApprovalAssignment {
  approverId: string;
  sequence: number;
}

type RoleInput = Parameters<typeof isSuperAdminRole>[0];

type RoleMatcher = (
  role: RoleInput,
) => boolean;

// ======================================================
// CONSTANTS
// ======================================================

const ALLOWED_FIELDS = [
  "designation",
  "categoryId",
  "grossSalary",
] as const;

const COMPLETED_APPROVAL_STATUSES =
  new Set<UpgradeApprovalStatus>([
    UpgradeApprovalStatus.APPROVED,
    UpgradeApprovalStatus.REJECTED,
    UpgradeApprovalStatus.SENT_BACK,
  ]);

type UpgradeField = (typeof ALLOWED_FIELDS)[number];

// ======================================================
// COMMON HELPERS
// ======================================================

const isAllowedField = (
  field: string,
): field is UpgradeField => {
  return ALLOWED_FIELDS.includes(field as UpgradeField);
};

const normalizeProposedData = (
  data: UpgradeData,
): UpgradeData => {
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    throw new Error("Invalid proposed employee data");
  }

  const invalidFields = Object.keys(data).filter(
    (field) => !isAllowedField(field),
  );

  if (invalidFields.length) {
    throw new Error(
      `Invalid upgrade fields: ${invalidFields.join(", ")}`,
    );
  }

  const normalized: UpgradeData = {};

  if (data.designation !== undefined) {
    if (
      data.designation !== null &&
      typeof data.designation !== "string"
    ) {
      throw new Error("Invalid designation");
    }

    normalized.designation =
      data.designation?.trim() || null;
  }

  if (data.categoryId !== undefined) {
    if (
      data.categoryId !== null &&
      typeof data.categoryId !== "string"
    ) {
      throw new Error("Invalid department");
    }

    normalized.categoryId =
      data.categoryId?.trim() || null;
  }

  if (data.grossSalary !== undefined) {
    if (data.grossSalary === null) {
      normalized.grossSalary = null;
    } else {
      const salary = Number(data.grossSalary);

      if (!Number.isFinite(salary) || salary < 0) {
        throw new Error(
          "Gross salary must be a valid non-negative number",
        );
      }

      normalized.grossSalary = salary;
    }
  }

  if (!Object.keys(normalized).length) {
    throw new Error("At least one proposed field is required");
  }

  return normalized;
};

const getChangedFields = (
  currentData: UpgradeData,
  proposedData: UpgradeData,
): UpgradeField[] => {
  return (Object.keys(proposedData) as string[]).filter(
    (field): field is UpgradeField => {
      if (!isAllowedField(field)) {
        return false;
      }

      return currentData[field] !== proposedData[field];
    },
  );
};

const getCurrentEmployeeData = (employee: {
  designation: string | null;
  categoryId: string | null;
  grossSalary: number | null;
}): UpgradeData => ({
  designation: employee.designation,
  categoryId: employee.categoryId,
  grossSalary: employee.grossSalary,
});

const isCompanyAdminOnly = (
  role: RoleInput,
): boolean => {
  return (
    isCompanyAdminRole(role) &&
    !isSuperAdminRole(role)
  );
};

// ======================================================
// APPROVER LOOKUP
// ======================================================

const findApprover = async (
  roleMatcher: RoleMatcher,
  companyId?: string,
  excludeUserId?: string,
) => {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,

      ...(companyId
        ? { companyId }
        : {}),

      ...(excludeUserId
        ? {
          id: {
            not: excludeUserId,
          },
        }
        : {}),
    },

    include: {
      role: true,
    },

    orderBy: {
      createdAt: "asc",
    },
  });

  return (
    users.find((user) =>
      roleMatcher(user.role),
    ) ?? null
  );
};

// ======================================================
// VALIDATE PROPOSED DATA
// ======================================================

const validateProposedData = async (
  companyId: string,
  employeeBranchId: string | null,
  proposedData: UpgradeData,
): Promise<void> => {
  const fields = Object.keys(proposedData);

  if (!fields.length) {
    throw new Error(
      "At least one proposed field is required",
    );
  }

  const invalidFields = fields.filter(
    (field) => !isAllowedField(field),
  );

  if (invalidFields.length) {
    throw new Error(
      `Invalid upgrade fields: ${invalidFields.join(", ")}`,
    );
  }

  // Department validation.
  // Branch cannot be changed from the upgrade form.
  // Therefore, department must belong to employee's current branch.

  if (
    proposedData.categoryId !== undefined &&
    proposedData.categoryId !== null
  ) {
    if (!employeeBranchId) {
      throw new Error(
        "Employee must have an assigned branch before changing department",
      );
    }

    const category = await prisma.category.findFirst({
      where: {
        id: proposedData.categoryId,
        companyId,
        branchId: employeeBranchId,
        isActive: true,
      },

      select: {
        id: true,
      },
    });

    if (!category) {
      throw new Error(
        "Selected department does not belong to the employee's company and branch",
      );
    }
  }

  // Gross salary validation.

  if (
    proposedData.grossSalary !== undefined &&
    proposedData.grossSalary !== null
  ) {
    if (
      !Number.isFinite(proposedData.grossSalary) ||
      proposedData.grossSalary < 0
    ) {
      throw new Error(
        "Gross salary must be a valid non-negative number",
      );
    }
  }
};

// ======================================================
// APPROVAL ASSIGNMENT
// ======================================================

const buildApprovalAssignments = async (
  companyId: string,
  employee: {
    id: string;
    reportingManagerId: string | null;
  },
  requester: {
    id: string;
    role: RoleInput;
  },
): Promise<{
  assignments: ApprovalAssignment[];
  directApproval: boolean;
}> => {
  const assignments: ApprovalAssignment[] = [];

  const requesterRole = requester.role;
  const roleName = getRoleName(requesterRole);

  // 1. Super Admin: Direct approval
  if (isSuperAdminRole(requesterRole)) {
    return {
      assignments,
      directApproval: true,
    };
  }

  // 2. Company Admin: Super Admin approval
  if (isCompanyAdminOnly(requesterRole)) {
    const superAdmin = await findApprover(
      isSuperAdminRole,
      undefined,
      requester.id,
    );

    if (!superAdmin) {
      throw new Error("No active Super Admin found");
    }

    assignments.push({
      approverId: superAdmin.id,
      sequence: 1,
    });

    return {
      assignments,
      directApproval: false,
    };
  }

  // 3. Employee: Only self-request allowed
  const isEmployeeSelfRequest =
    roleName === "employee" &&
    requester.id === employee.id;

  // 4. HR can initiate for employees
  const isHR = isHRRole(requesterRole);

  // 5. Reporting Manager can initiate for reporting employees
  const isReportingManager =
    employee.reportingManagerId === requester.id;

  if (
    !isHR &&
    !isReportingManager &&
    !isEmployeeSelfRequest
  ) {
    throw new Error(
      `User role ${roleName || "unknown"} cannot initiate employee upgrades`,
    );
  }

  // 6. Reporting Manager approval
  // Skip if requester is already the Reporting Manager.

  if (
    employee.reportingManagerId &&
    employee.reportingManagerId !== requester.id
  ) {
    const manager = await prisma.user.findFirst({
      where: {
        id: employee.reportingManagerId,
        companyId,
        isActive: true,
        employmentStatus: EmploymentStatus.ACTIVE,
      },
      select: {
        id: true,
      },
    });

    if (manager) {
      assignments.push({
        approverId: manager.id,
        sequence: 1,
      });
    }
  }

  // 7. Company Admin final approval

  const companyAdmin = await findApprover(
    isCompanyAdminOnly,
    companyId,
    requester.id,
  );

  if (!companyAdmin) {
    throw new Error("No active Company Admin found");
  }

  assignments.push({
    approverId: companyAdmin.id,
    sequence: assignments.length + 1,
  });

  return {
    assignments,
    directApproval: false,
  };
};

// ======================================================
// APPLY APPROVED UPGRADE
// ======================================================

export const applyApprovedUpgrade = async (
  upgradeId: string,
) => {
  return prisma.$transaction(async (tx) => {
    const upgrade = await tx.employeeUpgrade.findUnique({
      where: {
        id: upgradeId,
      },
    });

    if (!upgrade) {
      throw new Error("Upgrade request not found");
    }

    if (
      upgrade.status !== EmployeeUpgradeStatus.APPROVED &&
      upgrade.status !== EmployeeUpgradeStatus.APPLIED
    ) {
      throw new Error(
        "Only approved upgrades can be applied",
      );
    }

    if (upgrade.status === EmployeeUpgradeStatus.APPLIED) {
      return upgrade;
    }

    if (upgrade.appliedAt) {
      return upgrade;
    }

    if (
      upgrade.effectiveDate.getTime() > Date.now()
    ) {
      throw new Error(
        "Upgrade effective date has not arrived",
      );
    }

    // Verify employee belongs to this company.

    const employee = await tx.user.findFirst({
      where: {
        id: upgrade.employeeId,
        companyId: upgrade.companyId,
      },

      select: {
        id: true,
      },
    });

    if (!employee) {
      throw new Error(
        "Employee not found in upgrade company",
      );
    }

    // Conditional update prevents duplicate application.
    // If anything below fails, the transaction rolls back.

    const claim = await tx.employeeUpgrade.updateMany({
      where: {
        id: upgrade.id,
        status: EmployeeUpgradeStatus.APPROVED,
        appliedAt: null,
      },

      data: {
        status: EmployeeUpgradeStatus.APPLIED,
        appliedAt: new Date(),
      },
    });

    if (claim.count !== 1) {
      const latest = await tx.employeeUpgrade.findUnique({
        where: {
          id: upgrade.id,
        },
      });

      if (
        latest?.status === EmployeeUpgradeStatus.APPLIED
      ) {
        return latest;
      }

      throw new Error(
        "Upgrade has already been processed",
      );
    }

    const proposedData =
      normalizeProposedData(
        upgrade.proposedData as unknown as UpgradeData,
      );

    const currentData =
      upgrade.currentData as unknown as UpgradeData;

    const employeeUpdate: Prisma.UserUpdateInput = {};

    for (const field of upgrade.changedFields) {
      if (!isAllowedField(field)) {
        continue;
      }

      const value = proposedData[field];

      switch (field) {
        case "designation": {
          employeeUpdate.designation =
            value as string | null;

          break;
        }

        case "categoryId": {
          const categoryId = value as string | null;

          employeeUpdate.category = categoryId
            ? {
              connect: {
                id: categoryId,
              },
            }
            : {
              disconnect: true,
            };

          break;
        }

        case "grossSalary": {
          employeeUpdate.grossSalary =
            value as number | null;

          break;
        }
      }
    }

    // Update Employee Master.

    await tx.user.update({
      where: {
        id: upgrade.employeeId,
      },

      data: employeeUpdate,
    });

    // Complete career history snapshot.

    const newData: UpgradeData = {
      ...currentData,
      ...proposedData,
    };

    // Save immutable career history.

    await tx.employeeCareerHistory.upsert({
      where: {
        upgradeId: upgrade.id,
      },
      update: {},
      create: {
        companyId: upgrade.companyId,
        employeeId: upgrade.employeeId,
        upgradeId: upgrade.id,
        createdById: upgrade.requestedById,
        changeType: upgrade.upgradeType,
        effectiveDate: upgrade.effectiveDate,

        previousData: currentData as Prisma.InputJsonValue,
        newData: newData as Prisma.InputJsonValue,
      },
    });

    return tx.employeeUpgrade.findUniqueOrThrow({
      where: {
        id: upgrade.id,
      },
    });
  });
};

// ======================================================
// CREATE UPGRADE REQUEST
// ======================================================

export const createUpgradeRequest = async (
  input: CreateUpgradeInput,
) => {
  const {
    companyId,
    employeeId,
    requestedById,
    upgradeType,
    effectiveDate,
    reason,
    remarks,
  } = input;

  if (
    !companyId ||
    !employeeId ||
    !requestedById
  ) {
    throw new Error(
      "Company, employee and requester are required",
    );
  }

  if (!reason?.trim()) {
    throw new Error("Upgrade reason is required");
  }

  if (
    !(effectiveDate instanceof Date) ||
    Number.isNaN(effectiveDate.getTime())
  ) {
    throw new Error(
      "Valid effective date is required",
    );
  }

  const proposedData = normalizeProposedData(
    input.proposedData,
  );

  const [employee, requester] = await Promise.all([
    prisma.user.findFirst({
      where: {
        id: employeeId,
        companyId,
        isActive: true,
        employmentStatus: EmploymentStatus.ACTIVE,
      },

      include: {
        role: true,
      },
    }),

    prisma.user.findFirst({
      where: {
        id: requestedById,
        isActive: true,

        OR: [
          {
            companyId,
          },
          {
            companyId: null,
          },
        ],
      },

      include: {
        role: true,
      },
    }),
  ]);

  if (!employee) {
    throw new Error(
      "Employee not found in this company",
    );
  }

  if (!requester || !requester.role) {
    throw new Error(
      "Requester or requester role not found",
    );
  }

  const superAdmin = isSuperAdminRole(
    requester.role,
  );

  if (
    !superAdmin &&
    requester.companyId !== companyId
  ) {
    throw new Error(
      "You cannot create an upgrade for another company",
    );
  }

  // Validate proposed department against existing employee branch.

  await validateProposedData(
    companyId,
    employee.branchId,
    proposedData,
  );

  const currentData = getCurrentEmployeeData(
    employee,
  );

  const changedFields = getChangedFields(
    currentData,
    proposedData,
  );

  if (!changedFields.length) {
    throw new Error(
      "Proposed details are same as current details",
    );
  }

  const {
    assignments,
    directApproval,
  } = await buildApprovalAssignments(
    companyId,
    employee,
    requester,
  );

  const upgrade = await prisma.$transaction(
    async (tx) => {
      const createdUpgrade =
        await tx.employeeUpgrade.create({
          data: {
            companyId,
            employeeId,
            requestedById,
            upgradeType,

            status: directApproval
              ? EmployeeUpgradeStatus.APPROVED
              : EmployeeUpgradeStatus.PENDING,

            currentData:
              currentData as Prisma.InputJsonValue,

            proposedData:
              proposedData as Prisma.InputJsonValue,

            changedFields,
            effectiveDate,
            reason: reason.trim(),
            remarks: remarks?.trim() || null,
            submittedAt: new Date(),

            ...(directApproval
              ? {
                approvedAt: new Date(),
              }
              : {}),
          },
        });

      if (assignments.length) {
        await tx.upgradeApproval.createMany({
          data: assignments.map((assignment) => ({
            companyId,
            upgradeId: createdUpgrade.id,
            approverId: assignment.approverId,
            sequence: assignment.sequence,
            status: UpgradeApprovalStatus.PENDING,
          })),
        });
      }

      return createdUpgrade;
    },
  );

  // Super Admin direct approval.

  if (
    directApproval &&
    effectiveDate.getTime() <= Date.now()
  ) {
    return applyApprovedUpgrade(upgrade.id);
  }

  return getUpgradeRequestById(
    upgrade.id,
    companyId,
    requestedById,
  );
};

// ======================================================
// GET UPGRADE REQUESTS
// ======================================================

// ======================================================
// GET UPGRADE REQUESTS
// ======================================================

export const getUpgradeRequests = async (
  companyId: string,
  filters: UpgradeListFilters = {},
) => {
  if (!companyId) {
    throw new Error("Company ID is required");
  }

  const {
    status,
    employeeId,
    search,
    page = 1,
    limit = 10,
    approverId,
    approvalView,
  } = filters;

  const safePage = Math.max(1, Math.floor(page));

  const safeLimit = Math.min(
    100,
    Math.max(1, Math.floor(limit)),
  );

  const where: Prisma.EmployeeUpgradeWhereInput = {
    companyId,

    ...(status
      ? { status }
      : {}),

    ...(employeeId
      ? { employeeId }
      : {}),

    ...(search?.trim()
      ? {
        employee: {
          OR: [
            {
              name: {
                contains: search.trim(),
                mode: "insensitive",
              },
            },
            {
              email: {
                contains: search.trim(),
                mode: "insensitive",
              },
            },
            {
              employeeCode: {
                contains: search.trim(),
                mode: "insensitive",
              },
            },
          ],
        },
      }
      : {}),

    // Completed: only requests where current user
    // has personally taken an approval action.
    ...(approverId && approvalView === "COMPLETED"
      ? {
        approvals: {
          some: {
            approverId,
            status: {
              in: [
                UpgradeApprovalStatus.APPROVED,
                UpgradeApprovalStatus.REJECTED,
                UpgradeApprovalStatus.SENT_BACK,
              ],
            },
          },
        },
      }
      : {}),
  };

  const requests = await prisma.employeeUpgrade.findMany({
    where,

    orderBy: {
      createdAt: "desc",
    },

    include: {
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          employeeCode: true,
          designation: true,
        },
      },

      requestedBy: {
        select: {
          id: true,
          name: true,
        },
      },

      approvals: {
        orderBy: {
          sequence: "asc",
        },

        include: {
          approver: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  const formattedRequests = requests.map((request) => {
    const firstPending = request.approvals.find(
      (approval) =>
        approval.status === UpgradeApprovalStatus.PENDING,
    );

    const canAct = Boolean(
      approverId &&
      request.status === EmployeeUpgradeStatus.PENDING &&
      firstPending?.approverId === approverId,
    );

    // All completed actions performed by current user.
    // Keep all cycles, including actions before resubmission.
    const myApprovals = approverId
      ? request.approvals.filter(
        (approval) =>
          approval.approverId === approverId &&
          COMPLETED_APPROVAL_STATUSES.has(approval.status),
      )
      : [];

    return {
      ...request,
      initiatedBy: request.requestedBy,
      canAct,
      myApprovals,
    };
  });

  let filteredRequests = formattedRequests;

  // Pending tab: show only requests currently assigned to user.
  if (approverId && approvalView === "PENDING") {
    filteredRequests = formattedRequests.filter(
      (request) => request.canAct,
    );
  }

  // Completed tab: show requests where user has already acted.
  if (approverId && approvalView === "COMPLETED") {
    filteredRequests = formattedRequests.filter(
      (request) => request.myApprovals.length > 0,
    );
  }

  // Backward compatibility for existing callers.
  if (approverId && !approvalView) {
    filteredRequests = formattedRequests.filter(
      (request) => request.canAct,
    );
  }

  const total = filteredRequests.length;

  const skip = (safePage - 1) * safeLimit;

  return {
    data: filteredRequests.slice(
      skip,
      skip + safeLimit,
    ),

    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};

// ======================================================
// GET SINGLE UPGRADE REQUEST
// ======================================================

export const getUpgradeRequestById = async (
  upgradeId: string,
  companyId: string,
  currentUserId?: string,
) => {
  if (!upgradeId || !companyId) {
    throw new Error(
      "Upgrade ID and company ID are required",
    );
  }

  const request = await prisma.employeeUpgrade.findFirst({
    where: {
      id: upgradeId,
      companyId,
    },

    include: {
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          employeeCode: true,
          designation: true,
        },
      },

      requestedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },

      approvals: {
        orderBy: {
          sequence: "asc",
        },

        include: {
          approver: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!request) {
    throw new Error(
      "Upgrade request not found",
    );
  }

  const firstPending = request.approvals.find(
    (approval) =>
      approval.status ===
      UpgradeApprovalStatus.PENDING,
  );

  return {
    ...request,

    initiatedBy: request.requestedBy,

    canAct: Boolean(
      currentUserId &&
      request.status === EmployeeUpgradeStatus.PENDING &&
      firstPending?.approverId === currentUserId,
    ),
  };
};

// ======================================================
// APPROVE / REJECT / SEND BACK
// ======================================================

export const actOnUpgradeRequest = async (
  input: ApprovalActionInput,
) => {
  const {
    upgradeId,
    companyId,
    approverId,
    action,
    comments,
  } = input;

  if (
    !upgradeId ||
    !companyId ||
    !approverId
  ) {
    throw new Error(
      "Upgrade, company and approver are required",
    );
  }

  if (
    action !== "APPROVE" &&
    action !== "REJECT" &&
    action !== "SEND_BACK"
  ) {
    throw new Error("Invalid approval action");
  }

  if (
    (action === "REJECT" ||
      action === "SEND_BACK") &&
    !comments?.trim()
  ) {
    throw new Error(
      "Comments are required for this action",
    );
  }

  const updatedUpgrade = await prisma.$transaction(
    async (tx) => {
      const upgrade =
        await tx.employeeUpgrade.findFirst({
          where: {
            id: upgradeId,
            companyId,
            status: EmployeeUpgradeStatus.PENDING,
          },

          include: {
            approvals: {
              orderBy: {
                sequence: "asc",
              },
            },
          },
        });

      if (!upgrade) {
        throw new Error(
          "Pending upgrade request not found",
        );
      }

      // Requester cannot approve their own request.

      if (upgrade.requestedById === approverId) {
        throw new Error(
          "You cannot approve your own upgrade request",
        );
      }

      const currentApproval =
        upgrade.approvals.find(
          (approval) =>
            approval.status ===
            UpgradeApprovalStatus.PENDING,
        );

      if (
        !currentApproval ||
        currentApproval.approverId !== approverId
      ) {
        throw new Error(
          "This request is not assigned to you",
        );
      }

      const approvalStatus =
        action === "APPROVE"
          ? UpgradeApprovalStatus.APPROVED
          : action === "REJECT"
            ? UpgradeApprovalStatus.REJECTED
            : UpgradeApprovalStatus.SENT_BACK;

      // Conditional approval update.

      const approvalUpdate =
        await tx.upgradeApproval.updateMany({
          where: {
            id: currentApproval.id,
            approverId,
            status: UpgradeApprovalStatus.PENDING,
          },

          data: {
            status: approvalStatus,
            comments: comments?.trim() || null,
            actedAt: new Date(),
          },
        });

      if (approvalUpdate.count !== 1) {
        throw new Error(
          "This approval has already been processed",
        );
      }

      // Reject or Send Back.

      if (action !== "APPROVE") {
        await tx.upgradeApproval.updateMany({
          where: {
            upgradeId,
            status: UpgradeApprovalStatus.PENDING,
          },

          data: {
            status: UpgradeApprovalStatus.SKIPPED,
          },
        });

        return tx.employeeUpgrade.update({
          where: {
            id: upgradeId,
          },

          data: {
            status:
              action === "REJECT"
                ? EmployeeUpgradeStatus.REJECTED
                : EmployeeUpgradeStatus.SENT_BACK,
          },
        });
      }

      // Check next approval level.

      const nextApproval =
        upgrade.approvals.find(
          (approval) =>
            approval.sequence >
            currentApproval.sequence &&
            approval.status ===
            UpgradeApprovalStatus.PENDING,
        );

      // Another approval is pending.

      if (nextApproval) {
        return tx.employeeUpgrade.findUniqueOrThrow({
          where: {
            id: upgradeId,
          },
        });
      }

      // All approval levels completed.

      return tx.employeeUpgrade.update({
        where: {
          id: upgradeId,
        },

        data: {
          status: EmployeeUpgradeStatus.APPROVED,
          approvedAt: new Date(),
        },
      });
    },
  );

  // Apply immediately if effective date has arrived.

  if (
    updatedUpgrade.status ===
    EmployeeUpgradeStatus.APPROVED &&
    updatedUpgrade.effectiveDate.getTime() <=
    Date.now()
  ) {
    return applyApprovedUpgrade(upgradeId);
  }

  return getUpgradeRequestById(
    upgradeId,
    companyId,
    approverId,
  );
};


// ======================================================
// RESUBMIT SENT-BACK UPGRADE REQUEST
// ======================================================

export const resubmitUpgradeRequest = async (
  input: ResubmitUpgradeInput,
) => {
  const {
    upgradeId,
    companyId,
    requestedById,
    effectiveDate,
    reason,
    remarks,
  } = input;

  if (!upgradeId || !companyId || !requestedById) {
    throw new Error(
      "Upgrade, company and requester are required",
    );
  }

  if (!reason?.trim()) {
    throw new Error("Upgrade reason is required");
  }

  if (
    !(effectiveDate instanceof Date) ||
    Number.isNaN(effectiveDate.getTime())
  ) {
    throw new Error("Valid effective date is required");
  }

  // Only the original requester can resubmit.
  const existing = await prisma.employeeUpgrade.findFirst({
    where: {
      id: upgradeId,
      companyId,
      requestedById,
      status: EmployeeUpgradeStatus.SENT_BACK,
    },
    include: {
      employee: {
        include: {
          role: true,
        },
      },
    },
  });

  if (!existing) {
    throw new Error(
      "Sent-back upgrade request not found or you are not authorized to resubmit it",
    );
  }

  const [employee, requester] = await Promise.all([
    prisma.user.findFirst({
      where: {
        id: existing.employeeId,
        companyId,
        isActive: true,
        employmentStatus: EmploymentStatus.ACTIVE,
      },
      include: {
        role: true,
      },
    }),

    prisma.user.findFirst({
      where: {
        id: requestedById,
        isActive: true,
        OR: [
          { companyId },
          { companyId: null },
        ],
      },
      include: {
        role: true,
      },
    }),
  ]);

  if (!employee) {
    throw new Error(
      "Employee not found or is no longer active in this company",
    );
  }

  if (!requester || !requester.role) {
    throw new Error("Original requester or role not found");
  }

  if (
    !isSuperAdminRole(requester.role) &&
    requester.companyId !== companyId
  ) {
    throw new Error(
      "You cannot resubmit a request for another company",
    );
  }

  const proposedData = normalizeProposedData(
    input.proposedData,
  );

  await validateProposedData(
    companyId,
    employee.branchId,
    proposedData,
  );

  // Always refresh current employee data.
  const currentData = getCurrentEmployeeData(employee);

  const changedFields = getChangedFields(
    currentData,
    proposedData,
  );

  if (!changedFields.length) {
    throw new Error(
      "Proposed details are same as current employee details",
    );
  }

  // Build a fresh approval chain.
  const {
    assignments,
    directApproval,
  } = await buildApprovalAssignments(
    companyId,
    employee,
    requester,
  );

  const updatedUpgrade = await prisma.$transaction(
    async (tx) => {
      // Protect against two simultaneous resubmissions.
      const claim = await tx.employeeUpgrade.updateMany({
        where: {
          id: upgradeId,
          companyId,
          requestedById,
          status: EmployeeUpgradeStatus.SENT_BACK,
        },
        data: {
          status: directApproval
            ? EmployeeUpgradeStatus.APPROVED
            : EmployeeUpgradeStatus.PENDING,

          currentData:
            currentData as Prisma.InputJsonValue,

          proposedData:
            proposedData as Prisma.InputJsonValue,

          changedFields,
          effectiveDate,
          reason: reason.trim(),
          remarks: remarks?.trim() || null,

          submittedAt: new Date(),
          approvedAt: directApproval ? new Date() : null,
          appliedAt: null,
        },
      });

      if (claim.count !== 1) {
        throw new Error(
          "This request has already been resubmitted",
        );
      }

      // Preserve old approval history.
      const latestApproval = await tx.upgradeApproval.findFirst({
        where: {
          upgradeId,
        },
        orderBy: {
          sequence: "desc",
        },
        select: {
          sequence: true,
        },
      });

      const nextSequence =
        (latestApproval?.sequence ?? 0) + 1;

      // Create fresh approval records after the old cycle.
      if (assignments.length) {
        await tx.upgradeApproval.createMany({
          data: assignments.map((assignment, index) => ({
            companyId,
            upgradeId,
            approverId: assignment.approverId,
            sequence: nextSequence + index,
            status: UpgradeApprovalStatus.PENDING,
          })),
        });
      }

      return tx.employeeUpgrade.findUniqueOrThrow({
        where: {
          id: upgradeId,
        },
      });
    },
  );

  // Apply immediately only for direct approval and due effective date.
  if (
    updatedUpgrade.status === EmployeeUpgradeStatus.APPROVED &&
    effectiveDate.getTime() <= Date.now()
  ) {
    return applyApprovedUpgrade(upgradeId);
  }

  return getUpgradeRequestById(
    upgradeId,
    companyId,
    requestedById,
  );
};

// ======================================================
// APPLY DUE APPROVED UPGRADES
// ======================================================

/**
 * Run this function through a scheduled job.
 * It applies approved upgrades whose effective dates have arrived.
 */

export const applyDueApprovedUpgrades = async () => {
  const dueUpgrades =
    await prisma.employeeUpgrade.findMany({
      where: {
        status: EmployeeUpgradeStatus.APPROVED,
        appliedAt: null,

        effectiveDate: {
          lte: new Date(),
        },
      },

      select: {
        id: true,
      },

      orderBy: {
        effectiveDate: "asc",
      },
    });

  const results = await Promise.allSettled(
    dueUpgrades.map(({ id }) =>
      applyApprovedUpgrade(id),
    ),
  );

  return {
    total: dueUpgrades.length,

    applied: results.filter(
      (result) => result.status === "fulfilled",
    ).length,

    failed: results.filter(
      (result) => result.status === "rejected",
    ).length,
  };
};



// ======================================================
// GET EMPLOYEE UPGRADE HISTORY
// ======================================================

export interface UpgradeHistoryFilters {
  employeeId?: string;
  search?: string;
  changeType?: EmployeeUpgradeType;
  page?: number;
  limit?: number;
}

export const getEmployeeUpgradeHistory = async (
  companyId: string,
  filters: UpgradeHistoryFilters = {},
) => {
  if (!companyId) {
    throw new Error("Company ID is required");
  }

  const {
    employeeId,
    search,
    changeType,
    page = 1,
    limit = 10,
  } = filters;

  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));

  const where: Prisma.EmployeeCareerHistoryWhereInput = {
    companyId,

    ...(employeeId ? { employeeId } : {}),

    ...(changeType ? { changeType } : {}),

    ...(search?.trim()
      ? {
        employee: {
          OR: [
            {
              name: {
                contains: search.trim(),
                mode: "insensitive",
              },
            },
            {
              email: {
                contains: search.trim(),
                mode: "insensitive",
              },
            },
            {
              employeeCode: {
                contains: search.trim(),
                mode: "insensitive",
              },
            },
          ],
        },
      }
      : {}),
  };

  const [data, total] = await prisma.$transaction([
    prisma.employeeCareerHistory.findMany({
      where,
      orderBy: [
        { effectiveDate: "desc" },
        { createdAt: "desc" },
      ],
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            designation: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        upgrade: {
          select: {
            status: true,
          },
        },
      },
    }),

    prisma.employeeCareerHistory.count({ where }),
  ]);

  return {
    data,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};