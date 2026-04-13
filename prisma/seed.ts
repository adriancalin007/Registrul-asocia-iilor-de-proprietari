// prisma/seed.ts
import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // 1. UAT — Sector 1 Bucharest
  const uat = await prisma.uAT.upsert({
    where: { sirutaCode: "179141" },
    update: {},
    create: {
      name: "Sector 1 Municipality of Bucharest",
      county: "Bucharest",
      sirutaCode: "179141",
      email: "contact@primaria1.ro",
      website: "https://www.primaria1.ro",
    },
  });
  console.log(`✅ UAT: ${uat.name}`);

  // 2. UAT Config
  await prisma.uATConfig.upsert({
    where: { uatId: uat.id },
    update: {},
    create: {
      uatId: uat.id,
      documentCategories: ["Internal Regulation", "Meeting Minutes", "Contract", "Financial Report", "Budget", "Other"],
      certificateTypes: ["PAYMENTS_UP_TO_DATE", "OWNERSHIP", "RESERVE_FUND", "GENERAL"],
    },
  });
  console.log("✅ UAT Config created");

  // 3. Super Admin
  const superAdminHash = await bcrypt.hash("SuperAdmin123!", 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@bloc-uat.local" },
    update: {},
    create: {
      email: "superadmin@bloc-uat.local",
      fullName: "Super Administrator",
      passwordHash: superAdminHash,
      emailVerified: true,
      isActive: true,
    },
  });
  await prisma.superAdmin.upsert({
    where: { userId: superAdmin.id },
    update: {},
    create: { userId: superAdmin.id },
  });
  console.log(`✅ Super Admin: ${superAdmin.email}`);

  // 4. UAT Operator
  const operatorHash = await bcrypt.hash("Operator123!", 12);
  const operator = await prisma.user.upsert({
    where: { email: "operator@sector1.ro" },
    update: {},
    create: {
      email: "operator@sector1.ro",
      fullName: "UAT Demo Operator",
      passwordHash: operatorHash,
      emailVerified: true,
      isActive: true,
    },
  });
  await prisma.uATOperator.upsert({
    where: { userId: operator.id },
    update: {},
    create: { userId: operator.id, uatId: uat.id, jobTitle: "Platform Coordinator" },
  });
  console.log(`✅ UAT Operator: ${operator.email}`);

  // 5. Pilot Association
  const association = await prisma.association.upsert({
    where: { fiscalCode: "12345678" },
    update: {},
    create: {
      uatId: uat.id,
      name: "Owners Association No. 1 Pilot",
      fiscalCode: "12345678",
      address: "Str. Exemplu nr. 1, Sector 1, Bucharest",
      neighborhood: "Aviatorilor",
      zone: "North",
      status: "ACTIVE",
      validatedAt: new Date(),
      validatedBy: operator.id,
      latitude: 44.4650,
      longitude: 26.0800,
    },
  });
  console.log(`✅ Association: ${association.name}`);

  // 6. Pilot Building
  const building = await prisma.building.upsert({
    where: { id: "building-pilot-001" },
    update: {},
    create: {
      id: "building-pilot-001",
      associationId: association.id,
      name: "Block 1, Staircase A",
      address: "Str. Exemplu nr. 1",
      staircaseCount: 1,
      unitCount: 20,
      builtYear: 1978,
    },
  });
  console.log(`✅ Building: ${building.name}`);

  // 7. Pilot Units
  for (let i = 1; i <= 5; i++) {
    await prisma.unit.upsert({
      where: { id: `unit-pilot-${i}` },
      update: {},
      create: {
        id: `unit-pilot-${i}`,
        buildingId: building.id,
        number: `${i}`,
        floor: Math.ceil(i / 2) - 1,
        area: 55 + i * 5,
        shareRatio: 5.0,
      },
    });
  }
  console.log("✅ Units created (1-5)");

  // 8. Manager
  const managerHash = await bcrypt.hash("Manager123!", 12);
  const manager = await prisma.user.upsert({
    where: { email: "manager@demo.ro" },
    update: {},
    create: {
      email: "manager@demo.ro",
      fullName: "Ion Popescu",
      passwordHash: managerHash,
      emailVerified: true,
      isActive: true,
    },
  });
  await prisma.mandate.upsert({
    where: { id: "mandate-manager-pilot" },
    update: {},
    create: {
      id: "mandate-manager-pilot",
      associationId: association.id,
      userId: manager.id,
      role: UserRole.MANAGER,
      startDate: new Date("2024-01-01"),
      isActive: true,
    },
  });
  console.log(`✅ Manager: ${manager.email}`);

  // 9. Owner
  const ownerHash = await bcrypt.hash("Owner123!", 12);
  const owner = await prisma.user.upsert({
    where: { email: "owner@demo.ro" },
    update: {},
    create: {
      email: "owner@demo.ro",
      fullName: "Maria Ionescu",
      passwordHash: ownerHash,
      emailVerified: true,
      isActive: true,
    },
  });
  const unit1 = await prisma.unit.findUnique({ where: { id: "unit-pilot-1" } });
  if (unit1) {
    await prisma.ownership.upsert({
      where: { id: "ownership-pilot-1" },
      update: {},
      create: {
        id: "ownership-pilot-1",
        unitId: unit1.id,
        userId: owner.id,
        type: "OWNER",
        startDate: new Date("2020-01-01"),
        isActive: true,
      },
    });
  }
  console.log(`✅ Owner: ${owner.email}`);

  console.log("\n🎉 Seed complete!\n");
  console.log("Test accounts:");
  console.log("  superadmin@bloc-uat.local  / SuperAdmin123!");
  console.log("  operator@sector1.ro        / Operator123!");
  console.log("  manager@demo.ro            / Manager123!");
  console.log("  owner@demo.ro              / Owner123!");
}

main()
  .catch(e => { console.error("❌ Seed error:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
