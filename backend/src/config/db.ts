

// import { PrismaClient } from "@prisma/client";
// import { PrismaPg } from "@prisma/adapter-pg";

// const adapter = new PrismaPg({
//   connectionString: process.env.DATABASE_URL!,
//   ssl:
//     process.env.NODE_ENV === "production"
//       ? {
//           rejectUnauthorized: false,
//         }
//       : false,
// });

// export const prisma = new PrismaClient({
//   adapter,
// });

// console.log("Connected to postgresql successfully");


// import { PrismaClient } from "@prisma/client";
// import { PrismaPg } from "@prisma/adapter-pg";

// const adapter = new PrismaPg({
//   connectionString: process.env.DATABASE_URL!,
//   ssl: {
//     rejectUnauthorized: false,
//   },
// });

// export const prisma = new PrismaClient({
//   adapter,
// });

// console.log("Connected to postgresql successfully");



import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
}

const isRenderDatabase = connectionString.includes(".render.com");

const adapter = new PrismaPg({
    connectionString,
    ssl: isRenderDatabase
        ? { rejectUnauthorized: false }
        : false,
});

export const prisma = new PrismaClient({
    adapter,
});