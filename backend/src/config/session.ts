// import session from "express-session";
// import pgSession from "connect-pg-simple";
// import { Pool } from "pg";

// const PgStore = pgSession(session);

// const pgPool = new Pool({
//     connectionString: process.env.DATABASE_URL
// });

// export const sessionMiddleware = session({
//     store: new PgStore({
//         pool: pgPool,
//         tableName: "sessions",
//     }),
//     name: "sid",
//     secret: process.env.SESSION_SECRET as string,
//     resave: false,
//     saveUninitialized: false,
//     proxy: true,
//     cookie: {
//         httpOnly: true,
//         secure: process.env.NODE_ENV === "production",
//         sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
//         maxAge: 1000 * 60 * 60 * 24
//     }

// })

import session from "express-session";
import pgSession from "connect-pg-simple";
import { Pool } from "pg";

const secret = process.env.SESSION_SECRET;

if (!secret) {
    throw new Error("SESSION_SECRET is not set");
}

const PgStore = pgSession(session);

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
        process.env.NODE_ENV === "production"
            ? {
                rejectUnauthorized: false,
            }
            : false,
});

export const sessionMiddleware = session({
    store: new PgStore({
        pool: pgPool,
        tableName: "sessions",
    }),
    name: "sid",
    secret,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 1000 * 60 * 60 * 24,
    },
});