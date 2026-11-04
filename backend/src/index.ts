import "dotenv/config";
// import dotenv from "dotenv";
import express from "express";
import http from "http";
import { Server } from "socket.io";
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
import attendanceReportRoutes from "./routes/Attendancereport.route.js";
import leaveReportRoutes from "./routes/leaveReport.routes.js";
import overtimeRoutes from "./routes/overtimeReport.routes.js";
import { setIO } from "./config/socket.js";
import { isAdminRole, isSuperAdminRole } from "./utilis/roleUtils.js";

// dotenv.config();
const app = express();
app.set("trust proxy", 1);
const server = http.createServer(app); // <-- HTTP server create kiya

// port is used for local development and production on render.
const port = Number(process.env.PORT) || 5000;



const io = new Server(server, {
    cors: {
        origin: [
            "http://localhost:5173",
            "https://hrms-dynamic-project.vercel.app",
        ],
        credentials: true,
    },
});

// Server instance ko controller ke liye available karna
setIO(io);

// 2. CORS aur Express Middlewares (Yahan session middleware pehle aana chahiye)
app.use(cors({
    origin: ['http://localhost:5173', "https://hrms-dynamic-project.vercel.app", 'https://hoppscotch.io'],
    credentials: true,
}));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));  // parse application/x-www-form-urlencoded

app.use(sessionMiddleware); // Session middleware to handle session management

// Socket.IO session middleware
io.engine.use(sessionMiddleware);

// 3. AB Socket.io ka authentication middleware chalega (Taaki ise session mil sake)
io.use(async (socket, next) => {
    try {
        const request = socket.request as typeof socket.request & {
            session?: {
                userId?: string;
            };
        };

        const userId = request.session?.userId;
        // 🛠️ DEVELOPMENT / TESTING FIX: Agar session nahi hai, toh testing ke liye allow kar sakte hain
        // if (!userId) {
        //     console.warn(" Unauthenticated socket connection attempt (Allowed for testing)");
        //     socket.data.userId = "test-user-id";
        //     socket.data.companyId = "test-company-id";
        //     socket.data.role = "Admin";
        //     return next(); // Testing ke liye connection pass kar diya
        // }

        if (!userId) {
            return next(new Error("Unauthorized: Please login first."));
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                companyId: true,
                role: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        if (!user) {
            return next(new Error("User not found."));
        }

        socket.data.userId = user.id;
        socket.data.companyId = user.companyId;
        socket.data.role = user.role?.name;

        next();
    } catch (error) {
        console.error("Socket authentication error:", error);
        next(new Error("Socket authentication failed."));
    }
});

io.on("connection", (socket) => {
    const { userId, companyId, role } = socket.data;

    console.log("Authenticated Socket Connected:", {
        socketId: socket.id,
        userId,
        companyId,
        role,
    });

    socket.join(`user:${userId}`);

    // Company Admin automatically joins their company room
    if (companyId && isAdminRole(role)) {
        socket.join(`company:${companyId}:attendance`);
    }

    // Attendance subscription
    socket.on(
        "attendance:subscribe",
        async (requestedCompanyId: string) => {
            try {
                if (
                    typeof requestedCompanyId !== "string" ||
                    !requestedCompanyId.trim()
                ) {
                    return;
                }

                const previousCompanyId = socket.data
                    .attendanceCompanyId as string | undefined;

                if (previousCompanyId) {
                    await socket.leave(
                        `company:${previousCompanyId}:attendance`
                    );
                    delete socket.data.attendanceCompanyId;
                }

                const selectedCompanyId = requestedCompanyId.trim();

                if (isSuperAdminRole(role)) {
                    const company = await prisma.company.findUnique({
                        where: { id: selectedCompanyId },
                        select: { id: true },
                    });

                    if (!company) return;

                    await socket.join(
                        `company:${company.id}:attendance`
                    );

                    socket.data.attendanceCompanyId = company.id;
                    return;
                }

                if (
                    isAdminRole(role) &&
                    companyId === selectedCompanyId
                ) {
                    await socket.join(
                        `company:${companyId}:attendance`
                    );
                }
            } catch (error) {
                console.error("Attendance subscription failed:", error);
            }
        }
    );

    // Unsubscribe
    socket.on("attendance:unsubscribe", async () => {
        const previousCompanyId = socket.data
            .attendanceCompanyId as string | undefined;

        if (previousCompanyId) {
            await socket.leave(
                `company:${previousCompanyId}:attendance`
            );
            delete socket.data.attendanceCompanyId;
        }
    });

    socket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", socket.id, reason);
    });
});

// This will only run in development mode local machine not in production on render
if (process.env.NODE_ENV !== "production") {
    app.use((req, res, next) => {
        console.log("SESSION CHECK:", {
            path: req.originalUrl,
            hasSession: Boolean(req.session),
            hasUserId: Boolean(req.session?.userId),
            cookieReceived: Boolean(req.headers.cookie),
        });

        next();
    });
}



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
app.use("/api/attendance-report", attendanceReportRoutes);
app.use("/api/leave-report", leaveReportRoutes);
app.use("/api/overtime", overtimeRoutes);

app.use('/checkin', checkInRouter)
app.use('/monthly-attendance', monthlyRouter)





// Socket.io Connection Logic (Biometric live event handler)
io.on("connection", (socket) => {
    const { userId, companyId, role } = socket.data;

    console.log("Authenticated Socket Connected:", {
        socketId: socket.id,
        userId,
        companyId,
        role,
    });

    // Private user room
    socket.join(`user:${userId}`);

    // Company-wise private room
    if (companyId && isAdminRole(role)) {
        socket.join(`company:${companyId}:attendance`);
    }

    socket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", {
            userId,
            reason,
        });
    });
});





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

        console.log("Database connected successfully!");

        server.listen(port, () => {
            console.log(` Server & Socket.io running on port ${port}`);
        });
    } catch (error: unknown) {
        console.error("Database connection failed:", error);
        process.exit(1);
    }
}

start();

