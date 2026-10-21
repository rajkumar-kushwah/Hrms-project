import { prisma } from "../../src/config/db.ts";

export const seedModules = async () => {
  const modules = [
    { name: "dashboard", displayName: "Dashboard", icon: "LayoutDashboard", url: "/dashboard", order: 1 },
    { name: "company", displayName: "Company Setup", icon: "Building2", url: "/company", order: 2 },
    { name: "company-users", displayName: "Company Users", icon: "UserCog", url: "/companyusers", order: 3 },
    { name: "branch", displayName: "Branch", icon: "GitBranch", url: "/branch", order: 4 },
    { name: "category", displayName: "Category", icon: "Tag", url: "/category", order: 5 },
    { name: "employee", displayName: "Employee", icon: "Users", url: "/employee", order: 6 },
    { name: "onboarding", displayName: "Onboarding", icon: "UserRoundPlus", url: "/onboarding", order: 7 },
    { name: "attendance", displayName: "Attendance", icon: "CalendarCheck", url: "/attendance", order: 8 },
    { name: "leave", displayName: "Leave", icon: "CalendarOff", url: "/leave", order: 9 },
    { name: "payroll", displayName: "Payroll", icon: "Wallet", url: "/payroll", order: 10 },
    { name: "reports", displayName: "Reports", icon: "BarChart2", url: "/reports", order: 11 },
    { name: "roles", displayName: "Roles & Permissions", icon: "ShieldCheck", url: "/roles", order: 12 },
    { name: "settings", displayName: "Settings", icon: "Settings", url: "/settings", order: 13 },

  ];

  // Parent modules
  for (const mod of modules) {
    await prisma.module.upsert({
      where: { name: mod.name },
      update: {
        displayName: mod.displayName,
        icon: mod.icon,
        url: mod.url,
        order: mod.order,
      },
      create: {
        ...mod,
        parentId: null,
      },
    });
  }

  console.log(" Parent modules seeded!");

  // Sub modules
  const attendance = await prisma.module.findUnique({ where: { name: "attendance" } });
  const leave = await prisma.module.findUnique({ where: { name: "leave" } });
  const reports = await prisma.module.findUnique({ where: { name: "reports" } });

  const subModules = [
    // Attendance
    { name: "attendance_list", displayName: "Attendance List", icon: "List", url: "/attendance/list", order: 1, parentId: attendance!.id },
    { name: "attendance_live", displayName: "Live Tracking", icon: "Radio", url: "/attendance/live", order: 2, parentId: attendance!.id },
    { name: "geo_fencing", displayName: "Geo Fencing", icon: "MapPin", url: "/attendance/geo-fencing", order: 3, parentId: attendance!.id },

    // Leave
    { name: "leave_request", displayName: "Leave Request", icon: "Send", url: "/leave/request", order: 1, parentId: leave!.id },
    { name: "leave_approval", displayName: "Leave Approval", icon: "CheckCircle", url: "/leave/approval", order: 2, parentId: leave!.id },
    { name: "leave_policy", displayName: "Leave Policy", icon: "FileText", url: "/leave/policy", order: 3, parentId: leave!.id },
    { name: "holiday", displayName: "Holidays", icon: "CalendarOff", url: "/holiday", order: 4, parentId: leave!.id },

    // Reports
    { name: "attendance_report", displayName: "Attendance Report", icon: "FileBarChart", url: "/reports/attendance", order: 1, parentId: reports!.id },
    { name: "leave_report", displayName: "Leave Report", icon: "FileBarChart2", url: "/reports/leave", order: 2, parentId: reports!.id },
    { name: "payroll_report", displayName: "Payroll Report", icon: "FileSpreadsheet", url: "/reports/payroll", order: 3, parentId: reports!.id },
    { name: "overtime_report", displayName: "Overtime Report", icon: "FileClock", url: "/reports/overtime", order: 4, parentId: reports!.id },
  ];

  for (const sub of subModules) {
    await prisma.module.upsert({
      where: { name: sub.name },
      update: {
        displayName: sub.displayName,
        icon: sub.icon,
        url: sub.url,
        order: sub.order,
        parentId: sub.parentId,
      },
      create: sub,
    });
  }

  console.log(" Sub modules seeded!");
};