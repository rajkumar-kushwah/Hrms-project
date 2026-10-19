import "dotenv/config";
import dotenv from "dotenv";
import express from "express";
import cors from 'cors'
import { prisma } from "./config/db.js";
import authRouter from "./routes/auth.route.js";
// import { sessionMiddlewere } from "./config/session.js";
import roleRouter from "./routes/Role.route.js";
import employeeRouter from "./routes/employee.route.js";
import checkInRouter from "./routes/checkIn.route.js";
import monthlyRouter from "./routes/monthly.route.js";
import { sessionMiddleware } from "./config/session.js";
import companyRouter from "./routes/company.route.js";
import userRoutes from "./routes/companyuser.routes.js";
import branchRouter from "./routes/branch.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import leaveTypeRoutes from "./routes/leaveType.routes.js";
import leaveRequestRoutes from "./routes/leaveRequest.routes.js";
import payrollRoutes from "./routes/payroll.routes.js";
import holidayRoutes from "./routes/holiday.routes.js";
import payrollReportRoutes from "./routes/payrollreport.routes.js";
import onboardingTemplateRoutes from "./routes/Onboardingtemplate.routes.js";
import onboardingRouter from "./routes/Onboarding.routes.js";
import { healthCheck } from "./utilis/dbErrors.js";
import { isDatabaseUnavailable } from "./utilis/dbErrors.js";
import type { Request, Response, NextFunction } from "express";


dotenv.config();
const app = express();
app.set("trust proxy", 1);
const port = 5000;


app.use(cors({
    origin: ['http://localhost:5173',
        "https://hrms-dynamic-project.vercel.app",
        'https://hoppscotch.io'],
    credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));  // parse application/x-www-form-urlencoded

app.use(sessionMiddleware); // Session middleware to handle session management

app.use((req, res, next) => {
    console.log("SESSION CHECK:", {
        path: req.originalUrl,
        hasSession: Boolean(req.session),
        hasUserId: Boolean(req.session?.userId),
        cookieReceived: Boolean(req.headers.cookie),
    });

    next(); // Move to the next middleware or route handler
});

app.get("/", (req, res) => {
    res.send("HRMS Backend API is running");
});
app.use('/api/auth', authRouter)
app.use('/api/roles', roleRouter)
app.use('/api/company', companyRouter)
app.use("/api/companyusers", userRoutes);
app.use('/api/branch', branchRouter)
app.use("/api/category", categoryRoutes);
app.use('/api/employee', employeeRouter)
app.use("/api/attendance", attendanceRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/leave-type", leaveTypeRoutes);
app.use("/api/leave-request", leaveRequestRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/holidays", holidayRoutes);
app.use("/api/payroll-report", payrollReportRoutes);
app.use("/api/onboarding-template", onboardingTemplateRoutes);
app.use("/api/onboarding", onboardingRouter);
app.get("/api/health", healthCheck)


app.use('/checkin', checkInRouter)
app.use('/monthly-attendance', monthlyRouter)

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("Global Catch Error:", err);

    // Agar error database ya session store (connect-pg-simple) ki wajah se hai
    if (
        isDatabaseUnavailable(err) ||
        err.code === "ECONNREFUSED" ||
        err.message?.includes("connect-pg-simple") ||
        err.toString().includes("ECONNREFUSED")
    ) {
        return res.status(503).json({
            success: false,
            code: "SERVICE_UNAVAILABLE",
            message: "Database connection is unavailable. Please try again later.",
        });
    }

    return res.status(500).json({
        success: false,
        message: err.message || "Internal server error",
    });
});

async function start() {
    try {
        await prisma.$connect();
        // await prisma.$queryRaw`SELECT 1`;
        // console.log("Prisma database connection verified");
        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    } catch (error) {
        console.log("Error connecting to database")
    }
}

start();

