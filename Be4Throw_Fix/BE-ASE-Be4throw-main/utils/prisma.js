const { PrismaClient } = require('@prisma/client');

// One shared instance so we don't open a new DB connection in every file
const prisma = new PrismaClient();

module.exports = prisma;