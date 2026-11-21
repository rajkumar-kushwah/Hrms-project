
import { prisma } from "../config/db.js";
import bcrypt from "bcrypt";
import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";

// Update profile
export const updateProfileService = async (
  userId: string,
  data: { name?: string }
) => {
  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name && { name: data.name }),
    },
  });
};

// Upload profile photo
export const uploadProfilePhotoService = async (
  userId: string,
  file: Express.Multer.File
) => {
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { profilePhotoId: true },
  });

  if (!existingUser) {
    throw new Error("User not found");
  }

  const uploadResult = await new Promise<{
    secure_url: string;
    public_id: string;
  }>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "hrms/profile-photos",
        resource_type: "image",
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error("Image upload failed"));
          return;
        }

        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );

    Readable.from(file.buffer).pipe(uploadStream);
  });

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        profilePhoto: uploadResult.secure_url,
        profilePhotoId: uploadResult.public_id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        profilePhoto: true,
        profilePhotoId: true,
      },
    });

    // Delete old photo after successful database update
    if (
      existingUser.profilePhotoId &&
      existingUser.profilePhotoId !== uploadResult.public_id
    ) {
      await cloudinary.uploader
        .destroy(existingUser.profilePhotoId, {
          resource_type: "image",
        })
        .catch((error) => {
          console.error("Old profile photo deletion failed:", error);
        });
    }

    return updatedUser;
  } catch (error) {
    // Rollback newly uploaded image if database update fails
    await cloudinary.uploader
      .destroy(uploadResult.public_id, { resource_type: "image" })
      .catch(() => null);

    throw error;
  }
};

// Change password
export const changePasswordService = async (
  userId: string,
  oldPassword: string,
  newPassword: string
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) throw new Error("User not found");

  const isValid = await bcrypt.compare(oldPassword, user.password);

  if (!isValid) {
    throw new Error("Current password is incorrect");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  return { message: "Password changed successfully" };
};

// Remove profile photo
export const removeProfilePhotoService = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      profilePhoto: true,
      profilePhotoId: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.profilePhoto && !user.profilePhotoId) {
    throw new Error("Profile photo not found");
  }

  // First clear photo from database
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      profilePhoto: null,
      profilePhotoId: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      profilePhoto: true,
      profilePhotoId: true,
    },
  });

  // Delete image from Cloudinary
  if (user.profilePhotoId) {
    try {
      const result = await cloudinary.uploader.destroy(
        user.profilePhotoId,
        { resource_type: "image" }
      );

      if (result.result !== "ok" && result.result !== "not found") {
        console.error("Cloudinary photo deletion failed:", result);
      }
    } catch (error) {
      console.error("Cloudinary photo deletion failed:", error);
    }
  }

  return updatedUser;
};