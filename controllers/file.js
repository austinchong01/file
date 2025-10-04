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
        size: file.size,
      },
    });

    console.log("Prisma stored file successfully:", newFile.displayName);
    return newFile;
  } catch (error) {
    if (error.code === "P2002") {
      const field = error.meta?.target?.[0];
      throw new Error(`A file with this ${field} already exists`);
    }
    if (error.code === "P2003")
      throw new Error("Invalid user or folder reference");

    throw error;
  }
}

async function getFile(id) {
  const foundFile = await prisma.file.findUnique({ where: { id } });

  if (!foundFile) throw new Error(`File with id '${id}' not found`);

  console.log("File found successfully:", foundFile.displayName);
  return foundFile;
}

async function updateFileName(id, displayName) {
  try {
    const updatedFile = await prisma.file.update({
      where: { id },
      data: { displayName },
    });

    console.log("File name updated successfully:", updatedFile.displayName);
    return updatedFile;
  } catch (error) {
    if (error.code === "P2025")
      throw new Error(`File with id '${id}' not found`);
    throw error;
  }
}

async function deleteFile(id) {
  try {
    const deletedFile = await prisma.file.delete({ where: { id } });

    console.log("File deleted successfully:", deletedFile.displayName);
    return deletedFile;
  } catch (error) {
    if (error.code === "P2025")
      throw new Error(`File with id '${id}' not found`);
    throw error;
  }
}

module.exports = { createFile, getFile, updateFileName, deleteFile };
