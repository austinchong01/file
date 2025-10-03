const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function createFile(file, folderId, result, userId, displayName) {
  try {
    const newFile = await prisma.file.create({
      data: {
        userId: userId,
        folderId: folderId,
        originalName: file.originalname,
        displayName: displayName,

        cloudinaryUrl: result.secure_url,
        cloudinaryPublicId: result.public_id,
        cloudinaryResourceType: result.resource_type,

        mimetype: file.mimetype,
        size: file.size
      },
    });

    console.log("Prisma stored file successfully:", newFile.displayName);
    return newFile;
  } catch (error) {
    // Handle specific Prisma errors
    if (error.code === "P2002") {
      const field = error.meta?.target?.[0];
      throw new Error(`A file with this ${field} already exists`);
    }
    if (error.code === "P2003") 
      throw new Error("Invalid user or folder reference");

    // Handle unknown error
    throw error;
  }
}

// delete file
//

module.exports = {};
