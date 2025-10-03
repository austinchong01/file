const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function createUser(username, email, password) {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      }
    });

    console.log("User created successfully:", user.username);
    return user;
  } catch (error) {
    if (error.code === "P2002") {
      const field = error.meta?.target?.[0];
      throw new Error(`${field} already exists`);
    }
    throw error;
  }
}

async function findUser(id) {
  const foundUser = await prisma.user.findUnique({ where: { id } });

  if (!foundUser) {
    throw new Error(`User with id '${id}' not found`);
  };

  console.log("User found successfully:", foundUser.username);
  return foundUser;
}

// async function updateUsername(newUsername, email) {
//   try {
//     const updatedUsername = await prisma.user.update({
//       where: { email },
//       data: { username: newUsername },
//     });

//     console.log("Username updated successfully:", updatedUsername);
//     return updatedUsername;
//   } catch (error) {
//     console.error("Error updating username:", error);

//     if (error.code === "P2002") {
//       const field = error.meta?.target?.[0];
//       throw new Error(`'${field}' already exists`);
//     }

//     if (error.code === "P2025")
//       throw new Error(`User with email '${email}' not found`);

//     throw error;
//   }
// }

async function deleteUser(id) {
  try {
    const deletedUser = await prisma.user.delete({ where: { id } });

    console.log("User deleted successfully:", deletedUser);
    return deletedUser;
  } catch (error) {
    console.error("Error deleting user:", error);

    if (error.code === "P2025")
      throw new Error(`User with email '${id}' not found`);

    throw error;
  }
}

module.exports = {
  createUser,
  findUser,
//   updateUsername,
  deleteUser,

};
