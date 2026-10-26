import multer from "multer";
import type { Request } from "express";

const allowedMimeTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

const onboardingUpload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
    files: 1,
  },

  fileFilter: (_req: Request, file, callback) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      callback(
        new Error("Only PDF, JPG and PNG files are allowed.")
      );
      return;
    }

    callback(null, true);
  },
});

export default onboardingUpload;