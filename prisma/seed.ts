// prisma/seed.ts
import { PrismaClient, UserRole, PeriodStatus, CivicType, SchoolType, AccountType, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rnd(min: number, max: number) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
}
function areaToRooms(area: number): number {
  if (area < 40) return 1;
  if (area < 60) return 2;
  if (area < 80) return 3;
  return 4;
}

// ─── Static data ──────────────────────────────────────────────────────────────

const RO_FIRST = ["Ion", "Maria", "Gheorghe", "Elena", "Dumitru", "Ana", "Nicolae", "Ioana", "Vasile", "Cristina",
  "Mihai", "Adriana", "Constantin", "Daniela", "Marian", "Alina", "Florin", "Raluca", "Bogdan", "Laura"];
const RO_LAST  = ["Popescu", "Ionescu", "Popa", "Constantin", "Gheorghe", "Stoica", "Dumitrescu", "Stan", "Radu",
  "Marin", "Moldovan", "Dinu", "Nistor", "Andrei", "Barbu", "Toma", "Preda", "Ene", "Lazar", "Vlad"];

function roName() {
  return `${pick(RO_FIRST)} ${pick(RO_LAST)}`;
}

const ASSOCIATIONS = [
  {
    id: "assoc-av1",
    fiscalCode: "21100001",
    name: "Asociația de Proprietari Nr. 1 Aviatorilor",
    address: "Str. Av. Aviatorilor nr. 12, Sector 1",
    neighborhood: "Aviatorilor",
    lat: 44.4720, lng: 26.0880,
    buildings: [{ id: "bld-av1-1", name: "Bloc 12", staircases: 1, floors: 8, aptsPerFloor: 2, builtYear: 1972 }],
  },
  {
    id: "assoc-dor1",
    fiscalCode: "21100002",
    name: "Asociația de Proprietari Nr. 12 Dorobanți",
    address: "Str. Dorobanților nr. 45, Sector 1",
    neighborhood: "Dorobanți",
    lat: 44.4680, lng: 26.0950,
    buildings: [{ id: "bld-dor1-1", name: "Bloc A", staircases: 2, floors: 9, aptsPerFloor: 4, builtYear: 1980 }],
  },
  {
    id: "assoc-flo1",
    fiscalCode: "21100003",
    name: "Asociația de Proprietari Floreasca 78",
    address: "Str. Floreasca nr. 78, Sector 1",
    neighborhood: "Floreasca",
    lat: 44.4760, lng: 26.1010,
    buildings: [
      { id: "bld-flo1-1", name: "Corp 1", staircases: 1, floors: 6, aptsPerFloor: 2, builtYear: 1968 },
      { id: "bld-flo1-2", name: "Corp 2", staircases: 1, floors: 6, aptsPerFloor: 2, builtYear: 1969 },
    ],
  },
  {
    id: "assoc-col1",
    fiscalCode: "21100004",
    name: "Asociația de Proprietari Bd. Colentina 120",
    address: "Bd. Colentina nr. 120, Sector 1",
    neighborhood: "Colentina",
    lat: 44.4580, lng: 26.1350,
    buildings: [{ id: "bld-col1-1", name: "Bloc 120", staircases: 2, floors: 10, aptsPerFloor: 4, builtYear: 1985 }],
  },
  {
    id: "assoc-ban1",
    fiscalCode: "21100005",
    name: "Asociația de Proprietari Băneasa Parc",
    address: "Str. Băneasa nr. 15, Sector 1",
    neighborhood: "Băneasa",
    lat: 44.5010, lng: 26.0740,
    buildings: [{ id: "bld-ban1-1", name: "Vila Bloc", staircases: 1, floors: 3, aptsPerFloor: 4, builtYear: 1990 }],
  },
  {
    id: "assoc-vic1",
    fiscalCode: "21100006",
    name: "Asociația de Proprietari Calea Victoriei 200",
    address: "Calea Victoriei nr. 200, Sector 1",
    neighborhood: "Victoriei",
    lat: 44.4490, lng: 26.0920,
    buildings: [
      { id: "bld-vic1-1", name: "Turn A", staircases: 1, floors: 12, aptsPerFloor: 4, builtYear: 1978 },
      { id: "bld-vic1-2", name: "Turn B", staircases: 1, floors: 12, aptsPerFloor: 4, builtYear: 1979 },
    ],
  },
  {
    id: "assoc-tit1",
    fiscalCode: "21100007",
    name: "Asociația de Proprietari Titulescu 56",
    address: "Bd. N. Titulescu nr. 56, Sector 1",
    neighborhood: "Titulescu",
    lat: 44.4530, lng: 26.0720,
    buildings: [{ id: "bld-tit1-1", name: "Bloc T56", staircases: 1, floors: 8, aptsPerFloor: 3, builtYear: 1976 }],
  },
  {
    id: "assoc-her1",
    fiscalCode: "21100008",
    name: "Asociația de Proprietari Herăstrău Lac",
    address: "Str. Herăstrău nr. 33, Sector 1",
    neighborhood: "Herăstrău",
    lat: 44.4810, lng: 26.0830,
    buildings: [{ id: "bld-her1-1", name: "Bloc Lac", staircases: 1, floors: 4, aptsPerFloor: 4, builtYear: 1994 }],
  },
  {
    id: "assoc-rom1",
    fiscalCode: "21100009",
    name: "Asociația de Proprietari Piața Romană 7",
    address: "P-ța Romană nr. 7, Sector 1",
    neighborhood: "Piața Romană",
    lat: 44.4450, lng: 26.0990,
    buildings: [{ id: "bld-rom1-1", name: "Bloc Central", staircases: 3, floors: 10, aptsPerFloor: 4, builtYear: 1981 }],
  },
  {
    id: "assoc-clu1",
    fiscalCode: "21100010",
    name: "Asociația de Proprietari Clucerului 9",
    address: "Str. Clucerului nr. 9, Sector 1",
    neighborhood: "Clucerului",
    lat: 44.4650, lng: 26.0780,
    buildings: [{ id: "bld-clu1-1", name: "Bloc 9", staircases: 1, floors: 9, aptsPerFloor: 5, builtYear: 1983 }],
  },
];

// Expense templates per category, scaled by apartment count
const EXPENSE_TEMPLATES = [
  { category: "Apă și canal",         baseAmount: 800,  scale: 15,  distrib: "BY_PERSON" },
  { category: "Energie electrică",    baseAmount: 400,  scale: 6,   distrib: "EQUAL"     },
  { category: "Termoficare / Căldură",baseAmount: 2000, scale: 30,  distrib: "BY_AREA"   },
  { category: "Lift",                 baseAmount: 350,  scale: 4,   distrib: "EQUAL"     },
  { category: "Curățenie",            baseAmount: 500,  scale: 8,   distrib: "BY_SHARE"  },
  { category: "Administrare",         baseAmount: 300,  scale: 5,   distrib: "EQUAL"     },
  { category: "Fond reparații",       baseAmount: 600,  scale: 10,  distrib: "BY_SHARE"  },
  { category: "Dezinsecție / Deratizare", baseAmount: 150, scale: 2, distrib: "EQUAL"   },
];

// Winter months (Nov-Feb) have heating; summer months don't
function expensesForMonth(month: number, aptCount: number) {
  const isWinter = month <= 2 || month >= 11;
  return EXPENSE_TEMPLATES
    .filter(t => t.category !== "Termoficare / Căldură" || isWinter)
    .map(t => ({
      category:         t.category,
      description:      `${t.category} – ${["Ian","Feb","Mar","Apr","Mai","Iun","Iul","Aug","Sep","Oct","Nov","Dec"][month-1]} 2026`,
      totalAmount:      Math.round((t.baseAmount + t.scale * aptCount) * (0.9 + Math.random() * 0.2)),
      distributionType: t.distrib as "BY_SHARE" | "EQUAL" | "BY_PERSON" | "BY_AREA",
    }));
}

// ─── Distribution calculation (mirrors genereaza route) ───────────────────────

type UnitInfo = { shareRatio: number; area: number; residents: number };

function distributeExpense(
  amount: number,
  distrib: string,
  unit: UnitInfo,
  totals: { shareRatio: number; area: number; residents: number; unitCount: number },
): number {
  if (distrib === "BY_SHARE")  return totals.shareRatio > 0 ? (unit.shareRatio / totals.shareRatio) * amount : amount / totals.unitCount;
  if (distrib === "EQUAL")     return amount / totals.unitCount;
  if (distrib === "BY_PERSON") return totals.residents > 0  ? (unit.residents  / totals.residents)  * amount : amount / totals.unitCount;
  if (distrib === "BY_AREA")   return totals.area > 0       ? (unit.area       / totals.area)        * amount : amount / totals.unitCount;
  return amount / totals.unitCount;
}

// ─── CNP generator (valid Romanian personal number) ───────────────────────────

function generateCNP(gender: "M" | "F", birthYear: number, birthMonth: number, birthDay: number, sector: number): string {
  // First digit: 1=M born 1900-1999, 2=F born 1900-1999, 5=M born 2000+, 6=F born 2000+
  const s = birthYear >= 2000
    ? (gender === "M" ? 5 : 6)
    : (gender === "M" ? 1 : 2);
  const yy = String(birthYear % 100).padStart(2, "0");
  const mm = String(birthMonth).padStart(2, "0");
  const dd = String(birthDay).padStart(2, "0");
  // County code for Bucharest sectors: 40=S1, 41=S2, 42=S3, 43=S4, 44=S5, 45=S6, 46=B-unknown
  const countyMap: Record<number, string> = { 1: "40", 2: "41", 3: "42", 4: "43", 5: "44", 6: "45" };
  const jj = countyMap[sector] ?? "46";
  const nnn = String(Math.floor(Math.random() * 899) + 100); // 100-998
  const partial = `${s}${yy}${mm}${dd}${jj}${nnn}`;
  // Check digit
  const weights = [2, 7, 9, 1, 4, 6, 3, 5, 8, 2, 7, 9];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(partial[i]) * weights[i];
  const remainder = sum % 11;
  const checkDigit = remainder < 10 ? remainder : 1;
  return partial + checkDigit;
}

// ─── 100 civic test users ─────────────────────────────────────────────────────

async function seedCivicUsers(hashFn: (pw: string) => Promise<string>, _uatId: string) {
  const RO_FIRST_M = ["Ion", "Mihai", "Gheorghe", "Nicolae", "Andrei", "Bogdan", "Florin", "Radu", "Cristian", "Alexandru"];
  const RO_FIRST_F = ["Maria", "Elena", "Ana", "Ioana", "Adriana", "Daniela", "Alina", "Raluca", "Laura", "Cristina"];
  const RO_LAST = ["Popescu", "Ionescu", "Popa", "Constantin", "Stoica", "Dumitrescu", "Stan", "Radu", "Marin", "Moldovan",
    "Dinu", "Nistor", "Andrei", "Barbu", "Toma", "Preda", "Ene", "Lazar", "Vlad", "Gheorghe"];

  const YEARS = [1965, 1970, 1975, 1980, 1982, 1985, 1987, 1990, 1992, 1995];
  const pw = await hashFn("Test123!");

  let created = 0;
  for (let i = 1; i <= 100; i++) {
    const gender: "M" | "F" = i % 2 === 0 ? "F" : "M";
    const firstName = gender === "M" ? RO_FIRST_M[i % RO_FIRST_M.length] : RO_FIRST_F[i % RO_FIRST_F.length];
    const lastName = RO_LAST[i % RO_LAST.length];
    const birthYear = YEARS[i % YEARS.length];
    const birthMonth = (i % 12) + 1;
    const birthDay = (i % 28) + 1;

    // 80 cetățeni S1, 20 proprietari din alte sectoare
    const isS1 = i <= 80;
    const sector = isS1 ? 1 : ((i % 5) + 2); // 2-6 for non-S1
    const civicType: CivicType = isS1 ? CivicType.CETATEAN_S1 : CivicType.PROPRIETAR;

    const cnp = generateCNP(gender, birthYear, birthMonth, birthDay, sector);
    const email = `cetatean.${i}@test.ro`;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          email,
          fullName: `${firstName} ${lastName}`,
          passwordHash: pw,
          emailVerified: true,
          isActive: true,
          cnp,
          civicType,
          domiciliuSector: isS1 ? 1 : sector,
          domiciliuAdresa: isS1
            ? `Str. Test nr. ${i}, Sector 1, București`
            : `Str. Test nr. ${i}, Sector ${sector}, București`,
          cnpVerifiedAt: new Date("2025-06-01"),
        },
      });
      created++;
    }
  }

  // Dev test accounts (easy to find on login selector)
  const DEV_USERS = [
    { email: "cetatean.s1@test.ro", fullName: "Cetățean Demo S1", civic: CivicType.CETATEAN_S1, sector: 1 },
    { email: "proprietar@test.ro",  fullName: "Proprietar Demo",  civic: CivicType.PROPRIETAR,  sector: 3 },
  ];
  for (const u of DEV_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          email: u.email,
          fullName: u.fullName,
          passwordHash: pw,
          emailVerified: true,
          isActive: true,
          cnp: generateCNP("M", 1985, 6, 15, u.sector),
          civicType: u.civic,
          domiciliuSector: u.sector,
          cnpVerifiedAt: new Date("2025-06-01"),
        },
      });
    }
  }

  console.log(`✅ ${created} cetățeni/proprietari test (+ 2 conturi dev)`);
}

// ─── 5 Școli reale Sector 1 ───────────────────────────────────────────────────

const SCOLI_SECTOR1 = [
  {
    id: "sc-lazr",
    name: "Colegiul Național „Gheorghe Lazăr“",
    address: "Bd. Regina Elisabeta nr. 32, Sector 1, București",
    type: SchoolType.LICEU,
    director: "Prof. Dr. Gheorghe Ionescu",
    contactEmail: "secretariat@cngl.ro",
    contactPhone: "021 314 20 34",
    website: "https://cngl.ro",
  },
  {
    id: "sc-dante",
    name: "Liceul Teoretic „Dante Alighieri“",
    address: "Str. italiana nr. 22, Sector 1, București",
    type: SchoolType.LICEU,
    director: "Prof. Maria Constantinescu",
    contactEmail: "secretariat@liceuledante.ro",
    contactPhone: "021 212 21 91",
  },
  {
    id: "sc-zoe",
    name: "Colegiul Național „Zoe Câmpineanu“",
    address: "Str. Ion Câmpineanu nr. 5, Sector 1, București",
    type: SchoolType.LICEU,
    director: "Prof. Elena Popa",
    contactEmail: "contact@cnzc.ro",
    contactPhone: "021 314 87 22",
  },
  {
    id: "sc-dinu",
    name: "Colegiul Național de Arte „Dinu Lipatti“",
    address: "Str. Știrbei Vodă nr. 110, Sector 1, București",
    type: SchoolType.LICEU,
    director: "Prof. Adriana Dumitrescu",
    contactEmail: "secretariat@cnadl.ro",
    contactPhone: "021 313 12 67",
  },
  {
    id: "sc-14",
    name: "Școala Gimnazială Nr. 14 „Petre Ispirescu“",
    address: "Str. Petre Ispirescu nr. 14, Sector 1, București",
    type: SchoolType.GENERALA,
    director: "Prof. Nicolae Stan",
    contactEmail: "scoala14@edu.ro",
    contactPhone: "021 222 33 44",
  },
];

const MATERII_LICEU = ["Matematică", "Fizică", "Chimie", "Biologie", "Română", "Engleză", "Franceză", "Istorie", "Geografie", "Informatică"];
const MATERII_GIMN = ["Matematică", "Română", "Engleză", "Istorie", "Geografie", "Biologie", "Fizică", "Chimie", "Educație fizică", "Arte vizuale"];
const PROFESORI = ["Popescu A.", "Ionescu M.", "Stan C.", "Radu E.", "Marin D.", "Dinu L.", "Popa G.", "Barbu F.", "Toma R.", "Vlad N."];

function orarForClasa(clasaId: string, isLiceu: boolean) {
  const materii = isLiceu ? MATERII_LICEU : MATERII_GIMN;
  const rows: { clasaId: string; ziSaptamana: number; ora: number; materie: string; profesor: string; sala: string }[] = [];
  for (let zi = 1; zi <= 5; zi++) {
    const nrOre = zi <= 3 ? 7 : 6;
    for (let ora = 1; ora <= nrOre; ora++) {
      const idx = (zi * 10 + ora) % materii.length;
      rows.push({
        clasaId,
        ziSaptamana: zi,
        ora,
        materie: materii[idx],
        profesor: PROFESORI[(zi + ora) % PROFESORI.length],
        sala: `S${((zi + ora) % 20) + 1}`,
      });
    }
  }
  return rows;
}

async function seedSchools(uatId: string) {
  for (const s of SCOLI_SECTOR1) {
    const scoala = await prisma.scoala.upsert({
      where:  { id: s.id },
      update: {},
      create: {
        id:           s.id,
        uatId,
        name:         s.name,
        address:      s.address,
        type:         s.type,
        director:     s.director,
        contactEmail: s.contactEmail,
        contactPhone: s.contactPhone,
        website:      (s as { website?: string }).website,
        status:       "ACTIVE",
      },
    });

    const isLiceu = s.type === SchoolType.LICEU;
    // Grades: liceu = IX-XII (9-12), generala = V-VIII (5-8)
    const gradeRange = isLiceu ? [9, 10, 11, 12] : [5, 6, 7, 8];
    const litere = ["A", "B", "C"];

    for (const an of gradeRange) {
      for (const litera of litere.slice(0, an <= 10 ? 3 : 2)) {
        const clasaId = `${s.id}-c${an}${litera.toLowerCase()}`;
        const clasa = await prisma.clasa.upsert({
          where:  { id: clasaId },
          update: {},
          create: {
            id:       clasaId,
            scoalaId: scoala.id,
            an,
            litera,
            diriginte: PROFESORI[(an + litera.charCodeAt(0)) % PROFESORI.length],
            nrElevi:  25 + Math.floor(Math.random() * 8),
          },
        });

        // Delete existing orar and recreate
        await prisma.orarClasa.deleteMany({ where: { clasaId: clasa.id } });
        const orarRows = orarForClasa(clasa.id, isLiceu);
        for (const row of orarRows) {
          await prisma.orarClasa.create({ data: row });
        }
      }
    }
    console.log(`✅ ${s.name}`);
  }
  console.log("✅ Școli Sector 1 sedate");
}

// ─── Grilă evaluare — 11 criterii oficiale ────────────────────────────────────

async function seedEvaluationGrid(superAdminId: string) {
  console.log("\n📋 Seeding grilă evaluare…");

  const GRID_ID = "grid-oficial-v1";
  const existing = await prisma.evaluationGrid.findUnique({ where: { id: GRID_ID } });
  if (existing) { console.log("  ↩ Grila există deja, se omite."); return; }

  const grid = await prisma.evaluationGrid.create({
    data: {
      id:           GRID_ID,
      versionLabel: "v1.0 — Grilă oficială 2025",
      description:  "Grila de evaluare a conformității asociațiilor de proprietari, 11 criterii, 110 puncte.",
      isActive:     true,
      thresholds:   { levels: [{ label: "CONFORME", minPercent: 80 }, { label: "AVERTISMENT", minPercent: 60 }, { label: "SOMATIE", minPercent: 40 }] },
      createdBy:    superAdminId,
    },
  });

  type Criterion = { number: number; title: string; description: string; maxPoints: number; isEliminator: boolean; scoringBarem: { points: number; label: string }[] };
  const CRITERIA: Criterion[] = [
    { number: 1,  isEliminator: true,  maxPoints: 15, title: "Înregistrare la judecătorie + statut actualizat",     description: "Hotărâre judecătorească + statut conform legii în vigoare.",        scoringBarem: [{ points: 15, label: "Hotărâre + statut actualizat" }, { points: 8, label: "Înregistrată, statut neactualizat post-2011" }, { points: 0, label: "Document lipsă" }] },
    { number: 2,  isEliminator: false, maxPoints: 10, title: "Regulament de condominiu adoptat",                     description: "Regulament intern adoptat de AGA și afișat la avizier.",            scoringBarem: [{ points: 10, label: "Adoptat, semnat și afișat" }, { points: 5, label: "Existent, neafișat sau neadoptat formal" }, { points: 0, label: "Lipsă" }] },
    { number: 3,  isEliminator: true,  maxPoints: 15, title: "Administrator atestat + contract de administrare",     description: "Atestat ANCPI valabil și contract de administrare în vigoare.",      scoringBarem: [{ points: 15, label: "Atestat valabil + contract activ" }, { points: 8, label: "Contract existent, atestat expirat" }, { points: 0, label: "Lipsă atestat sau contract" }] },
    { number: 4,  isEliminator: true,  maxPoints: 10, title: "Cenzor numit + raport de cenzurare depus",             description: "Cenzor desemnat de AGA + raport pentru ultimul exercițiu.",         scoringBarem: [{ points: 10, label: "Cenzor numit + raport depus" }, { points: 5, label: "Cenzor numit, raport nedepus" }, { points: 0, label: "Lipsă cenzor" }] },
    { number: 5,  isEliminator: false, maxPoints: 10, title: "Situație activ-pasiv depusă",                          description: "Situația financiară anuală întocmită și depusă.",                   scoringBarem: [{ points: 10, label: "Depusă și semnată" }, { points: 5, label: "Parțial completă sau cu întârziere" }, { points: 0, label: "Lipsă" }] },
    { number: 6,  isEliminator: false, maxPoints: 10, title: "AGA desfășurată în T1 al anului curent",               description: "Adunarea Generală convocată și desfășurată în primele 3 luni.",     scoringBarem: [{ points: 10, label: "AGA desfășurată legal, PV disponibil" }, { points: 5, label: "AGA desfășurată, documentație incompletă" }, { points: 0, label: "AGA nu a avut loc în termen" }] },
    { number: 7,  isEliminator: false, maxPoints: 10, title: "Liste de plată afișate în termen legal",               description: "Liste lunare afișate la avizier în termenul prevăzut de lege.",    scoringBarem: [{ points: 10, label: "Afișate lunar în termen" }, { points: 5, label: "Afișate cu întârzieri sau incomplete" }, { points: 0, label: "Neafișate sau lipsă" }] },
    { number: 8,  isEliminator: false, maxPoints: 10, title: "Fond de rulment + fond de reparații constituite",      description: "Ambele fonduri constituite și evidențiate separat.",                scoringBarem: [{ points: 10, label: "Ambele fonduri constituite" }, { points: 5, label: "Doar unul constituit" }, { points: 0, label: "Niciunul" }] },
    { number: 9,  isEliminator: true,  maxPoints:  5, title: "Înregistrare SPV ANAF + e-Factura activată",           description: "Asociația este înregistrată SPV și are e-Factura activă.",         scoringBarem: [{ points: 5, label: "SPV + e-Factura activă" }, { points: 2, label: "SPV, fără e-Factura" }, { points: 0, label: "Neînregistrată" }] },
    { number: 10, isEliminator: false, maxPoints:  5, title: "Sold de casă ≤ 1.000 lei",                             description: "Soldul de casă nu depășește plafonul legal de 1.000 lei.",         scoringBarem: [{ points: 5, label: "Sold ≤ 1.000 lei, registru actualizat" }, { points: 2, label: "Sold ≤ 1.000 lei, registru incomplet" }, { points: 0, label: "Sold depășit sau registru lipsă" }] },
    { number: 11, isEliminator: true,  maxPoints: 10, title: "Contract de mandat al președintelui",                  description: "Președintele are contract de mandat valabil pentru reprezentare legală.", scoringBarem: [{ points: 10, label: "Contract activ, semnat de ambele părți" }, { points: 5, label: "Contract existent, expirat sau neclar" }, { points: 0, label: "Lipsă contract de mandat" }] },
  ];

  for (const c of CRITERIA) {
    await prisma.evaluationCriterion.create({ data: { gridId: grid.id, number: c.number, title: c.title, description: c.description, maxPoints: c.maxPoints, isEliminator: c.isEliminator, isActive: true, scoringBarem: c.scoringBarem, displayOrder: c.number } });
  }
  const total = CRITERIA.reduce((s, c) => s + c.maxPoints, 0);
  console.log(`  ✓ ${CRITERIA.length} criterii · ${total} puncte total · ${CRITERIA.filter(c => c.isEliminator).length} eliminatorii`);
}

// ─── RBAC dinamic ─────────────────────────────────────────────────────────────

async function seedRBAC(hashFn: (pw: string) => Promise<string>) {
  console.log("\n🔐 Seeding RBAC dinamic…");

  // 1. Permisiuni predefinite
  const PERMISSIONS = [
    { key: "users.view_all",         category: "users",        description: "Vede toți utilizatorii platformei" },
    { key: "users.create_civil",     category: "users",        description: "Creează cont civil (cetățean/proprietar)" },
    { key: "users.create_official",  category: "users",        description: "Creează cont funcționar" },
    { key: "users.merge",            category: "users",        description: "Confirmă merge conturi civil ↔ funcționar" },
    { key: "users.deactivate",       category: "users",        description: "Dezactivează/reactivează cont utilizator" },
    { key: "users.assign_roles",     category: "users",        description: "Asignează/dezasignează roluri RBAC" },
    { key: "associations.read",      category: "associations", description: "Vede toate asociațiile UAT" },
    { key: "associations.approve",   category: "associations", description: "Aprobă/respinge asociații" },
    { key: "associations.configure", category: "associations", description: "Configurează setările unei asociații" },
    { key: "documents.read",         category: "documents",    description: "Vede documente oficiale ale asociațiilor" },
    { key: "documents.approve",      category: "documents",    description: "Aprobă/respinge documente oficiale" },
    { key: "audit.view",             category: "audit",        description: "Vede jurnalul de audit și AdminAuditLog" },
    { key: "reports.view",           category: "reports",      description: "Vede rapoartele UAT" },
    { key: "platform.configure",     category: "platform",     description: "Configurează platforma (nav pe rol)" },
    { key: "platform.manage_roles",  category: "platform",     description: "Creează/editează roluri RBAC custom" },
  ];
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where:  { key: p.key },
      update: { description: p.description },
      create: p,
    });
  }
  console.log(`  ✓ ${PERMISSIONS.length} permisiuni`);

  // 2. Roluri sistem
  const ROLES = [
    { name: "CITIZEN",    accountType: AccountType.CIVIL,    description: "Cetățean cu domiciliul în Sectorul 1" },
    { name: "OWNER",      accountType: AccountType.CIVIL,    description: "Proprietar al unui imobil în S1" },
    { name: "OPERATOR",   accountType: AccountType.OFFICIAL, description: "Funcționar UAT cu drepturi operaționale" },
    { name: "SUPERADMIN", accountType: AccountType.OFFICIAL, description: "Administrator platformă cu drepturi totale" },
  ] as const;

  const roleMap: Record<string, string> = {};
  for (const r of ROLES) {
    const role = await prisma.role.upsert({
      where:  { name: r.name },
      update: { description: r.description },
      create: { name: r.name, accountType: r.accountType, isSystem: true, description: r.description },
    });
    roleMap[r.name] = role.id;
  }
  console.log(`  ✓ ${ROLES.length} roluri sistem`);

  // 3. Mapare permisiuni → roluri
  const OPERATOR_PERMS = [
    "users.view_all", "users.deactivate",
    "associations.read", "associations.approve",
    "documents.read", "documents.approve",
    "audit.view", "reports.view",
  ];
  const SUPERADMIN_PERMS = PERMISSIONS.map(p => p.key);

  async function assignPerms(roleName: string, permKeys: string[]) {
    const roleId = roleMap[roleName];
    for (const key of permKeys) {
      const perm = await prisma.permission.findUnique({ where: { key } });
      if (!perm) continue;
      await prisma.rolePermission.upsert({
        where:  { roleId_permissionId: { roleId, permissionId: perm.id } },
        update: {},
        create: { roleId, permissionId: perm.id },
      });
    }
  }
  await assignPerms("OPERATOR", OPERATOR_PERMS);
  await assignPerms("SUPERADMIN", SUPERADMIN_PERMS);
  console.log("  ✓ Permisiuni asignate la roluri");

  // 4. Utilizatori mock
  async function assignRole(userId: string, roleName: string, actorId?: string) {
    const roleId = roleMap[roleName];
    await prisma.userRoleAssignment.upsert({
      where:  { userId_roleId: { userId, roleId } },
      update: {},
      create: { userId, roleId, assignedBy: actorId },
    });
  }

  // Superadmin RBAC
  const rbacSA = await prisma.user.upsert({
    where:  { email: "superadmin@sector1.ro" },
    update: {},
    create: {
      email:        "superadmin@sector1.ro",
      fullName:     "Super Admin Sector 1",
      firstName:    "Super Admin",
      lastName:     "Sector 1",
      passwordHash: await hashFn("SuperAdmin123!"),
      emailVerified: true,
      isActive:     true,
      accountType:  AccountType.OFFICIAL,
      status:       UserStatus.ACTIVE,
    },
  });
  await assignRole(rbacSA.id, "SUPERADMIN");

  // Cetățean simplu
  const ionPopescu = await prisma.user.upsert({
    where:  { email: "ion.popescu@test.ro" },
    update: {},
    create: {
      email:           "ion.popescu@test.ro",
      fullName:        "Ion Popescu",
      firstName:       "Ion",
      lastName:        "Popescu",
      passwordHash:    await hashFn("Test123!"),
      emailVerified:   true,
      isActive:        true,
      accountType:     AccountType.CIVIL,
      status:          UserStatus.ACTIVE,
      civicType:       CivicType.CETATEAN_S1,
      domiciliuSector: 1,
    },
  });
  await assignRole(ionPopescu.id, "CITIZEN");

  // Proprietar cu 1 proprietate
  const mariaIonescu = await prisma.user.upsert({
    where:  { email: "maria.ionescu@test.ro" },
    update: {},
    create: {
      email:           "maria.ionescu@test.ro",
      fullName:        "Maria Ionescu",
      firstName:       "Maria",
      lastName:        "Ionescu",
      passwordHash:    await hashFn("Test123!"),
      emailVerified:   true,
      isActive:        true,
      accountType:     AccountType.CIVIL,
      status:          UserStatus.ACTIVE,
      civicType:       CivicType.CETATEAN_S1,
      domiciliuSector: 1,
    },
  });
  await assignRole(mariaIonescu.id, "CITIZEN");
  await assignRole(mariaIonescu.id, "OWNER");
  await prisma.ownership.upsert({
    where:  { id: "own-rbac-maria-1" },
    update: {},
    create: {
      id: "own-rbac-maria-1", unitId: "bld-av1-1-u5",
      userId: mariaIonescu.id, type: "OWNER",
      startDate: new Date("2021-06-15"), isActive: true,
    },
  });

  // Proprietar cu 3 proprietăți
  const georgeMihai = await prisma.user.upsert({
    where:  { email: "george.mihai@test.ro" },
    update: {},
    create: {
      email:           "george.mihai@test.ro",
      fullName:        "George Mihai",
      firstName:       "George",
      lastName:        "Mihai",
      passwordHash:    await hashFn("Test123!"),
      emailVerified:   true,
      isActive:        true,
      accountType:     AccountType.CIVIL,
      status:          UserStatus.ACTIVE,
      civicType:       CivicType.PROPRIETAR,
      domiciliuSector: 2,
    },
  });
  await assignRole(georgeMihai.id, "OWNER");
  const georgeUnits = ["bld-av1-1-u6", "bld-dor1-1-u5", "bld-flo1-1-u3"];
  for (let i = 0; i < georgeUnits.length; i++) {
    const unitId = georgeUnits[i];
    await prisma.ownership.upsert({
      where:  { id: `own-rbac-george-${i + 1}` },
      update: {},
      create: {
        id: `own-rbac-george-${i + 1}`, unitId,
        userId: georgeMihai.id, type: "OWNER",
        startDate: new Date("2020-03-01"), isActive: true,
      },
    });
  }

  // Funcționar care e și proprietar (merge simulat)
  const danGheorghe = await prisma.user.upsert({
    where:  { email: "dan.gheorghe@test.ro" },
    update: {},
    create: {
      email:            "dan.gheorghe@test.ro",
      fullName:         "Dan Gheorghe",
      firstName:        "Dan",
      lastName:         "Gheorghe",
      passwordHash:     await hashFn("Test123!"),
      emailVerified:    true,
      isActive:         true,
      accountType:      AccountType.OFFICIAL,
      status:           UserStatus.ACTIVE,
      createdByAdminId: rbacSA.id,
    },
  });
  await assignRole(danGheorghe.id, "OPERATOR", rbacSA.id);
  await assignRole(danGheorghe.id, "OWNER",    rbacSA.id);
  await prisma.ownership.upsert({
    where:  { id: "own-rbac-dan-1" },
    update: {},
    create: {
      id: "own-rbac-dan-1", unitId: "bld-av1-1-u7",
      userId: danGheorghe.id, type: "OWNER",
      startDate: new Date("2019-11-01"), isActive: true,
    },
  });
  await prisma.adminAuditLog.create({
    data: {
      userId: danGheorghe.id, actorId: rbacSA.id,
      action: "ACCOUNT_MERGED",
      metadata: { note: "Seed: funcționar creat, merge cu cont civil simulat", roles: ["OPERATOR", "OWNER"] },
    },
  });

  // Asignează SUPERADMIN și contului existent superadmin@bloc-uat.local
  const existingSA = await prisma.user.findUnique({ where: { email: "superadmin@bloc-uat.local" } });
  if (existingSA) {
    await prisma.user.update({
      where: { id: existingSA.id },
      data:  { accountType: AccountType.OFFICIAL, status: UserStatus.ACTIVE },
    });
    await assignRole(existingSA.id, "SUPERADMIN");
  }

  console.log("  ✓ 5 utilizatori mock RBAC:");
  console.log("      superadmin@sector1.ro    / SuperAdmin123!  [SUPERADMIN]");
  console.log("      ion.popescu@test.ro      / Test123!        [CITIZEN]");
  console.log("      maria.ionescu@test.ro    / Test123!        [CITIZEN + OWNER, 1 proprietate]");
  console.log("      george.mihai@test.ro     / Test123!        [OWNER, 3 proprietăți]");
  console.log("      dan.gheorghe@test.ro     / Test123!        [OPERATOR + OWNER, merge simulat]");
}

async function main() {
  console.log("🌱 Seeding database…");

  // ── UAT ──────────────────────────────────────────────────────────────────────
  const uat = await prisma.uAT.upsert({
    where: { sirutaCode: "179141" },
    update: {},
    create: {
      name: "Sectorul 1 al Municipiului București",
      county: "București",
      sirutaCode: "179141",
      email: "contact@primaria1.ro",
      website: "https://www.primaria1.ro",
    },
  });
  await prisma.uATConfig.upsert({
    where: { uatId: uat.id },
    update: {},
    create: {
      uatId: uat.id,
      documentCategories: ["Regulament intern", "Proces-verbal AG", "Contract", "Raport financiar", "Buget", "Altele"],
      certificateTypes: ["PAYMENTS_UP_TO_DATE", "OWNERSHIP", "RESERVE_FUND", "GENERAL"],
    },
  });
  console.log(`✅ UAT: ${uat.name}`);

  // ── System accounts ───────────────────────────────────────────────────────────
  const hash = (pw: string) => bcrypt.hash(pw, 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@bloc-uat.local" },
    update: {},
    create: { email: "superadmin@bloc-uat.local", fullName: "Super Administrator", passwordHash: await hash("SuperAdmin123!"), emailVerified: true, isActive: true },
  });
  await prisma.superAdmin.upsert({ where: { userId: superAdmin.id }, update: {}, create: { userId: superAdmin.id } });

  const operator = await prisma.user.upsert({
    where: { email: "operator@sector1.ro" },
    update: {},
    create: { email: "operator@sector1.ro", fullName: "Mihaela Dumitrescu", passwordHash: await hash("Operator123!"), emailVerified: true, isActive: true },
  });
  await prisma.uATOperator.upsert({ where: { userId: operator.id }, update: {}, create: { userId: operator.id, uatId: uat.id, jobTitle: "Coordonator platformă" } });

  const demoManager = await prisma.user.upsert({
    where: { email: "manager@demo.ro" },
    update: {},
    create: {
      email: "manager@demo.ro",
      fullName: "Manager Demo",
      passwordHash: await hash("Manager123!"),
      emailVerified: true,
      isActive: true,
    },
  });

  console.log("✅ Conturi sistem create");

  // ── 10 Associations ───────────────────────────────────────────────────────────
  for (const a of ASSOCIATIONS) {
    const association = await prisma.association.upsert({
      where: { fiscalCode: a.fiscalCode },
      update: {},
      create: {
        id: a.id,
        uatId: uat.id,
        name: a.name,
        fiscalCode: a.fiscalCode,
        address: a.address,
        neighborhood: a.neighborhood,
        status: "ACTIVE",
        validatedAt: new Date("2025-01-15"),
        validatedBy: operator.id,
        latitude: a.lat,
        longitude: a.lng,
        geocodedAt: new Date("2025-01-15"),
      },
    });

    // Manager
    const mgrEmail = `manager.${slug(a.neighborhood)}@demo.ro`;
    const mgrUser = await prisma.user.upsert({
      where: { email: mgrEmail },
      update: {},
      create: {
        email: mgrEmail,
        fullName: roName(),
        passwordHash: await hash("Manager123!"),
        emailVerified: true,
        isActive: true,
      },
    });
    await prisma.mandate.upsert({
      where: { id: `mnd-${a.id}` },
      update: {},
      create: {
        id:            `mnd-${a.id}`,
        associationId: association.id,
        userId:        mgrUser.id,
        role:          UserRole.MANAGER,
        startDate:     new Date("2025-01-01"),
        isActive:      true,
      },
    });

    // Buildings + units
    const allUnitsInfo: { unitId: string; shareRatio: number; area: number; residents: number; ownerships: string[] }[] = [];

    for (const b of a.buildings) {
      const building = await prisma.building.upsert({
        where: { id: b.id },
        update: {},
        create: {
          id:            b.id,
          associationId: association.id,
          name:          b.name,
          address:       a.address,
          staircaseCount: b.staircases,
          unitCount:     b.floors * b.aptsPerFloor,
          builtYear:     b.builtYear,
        },
      });

      const AREA_TYPES = [35, 42, 55, 65, 75, 82, 90, 104];
      const totalUnits = b.floors * b.aptsPerFloor;
      const unitAreas: number[] = Array.from({ length: totalUnits }, (_, i) => AREA_TYPES[i % AREA_TYPES.length]);
      const totalArea = unitAreas.reduce((s, a) => s + a, 0);

      for (let u = 0; u < totalUnits; u++) {
        const floor   = Math.floor(u / b.aptsPerFloor);
        const aptNum  = `${floor === 0 ? "P" : floor}${String(u % b.aptsPerFloor + 1).padStart(2,"0")}`;
        const area    = unitAreas[u];
        const share   = Math.round((area / totalArea) * 10000) / 100; // percentage with 2 decimals
        const unitId  = `${b.id}-u${u + 1}`;

        const unit = await prisma.unit.upsert({
          where: { id: unitId },
          update: { rooms: areaToRooms(area) },
          create: {
            id:         unitId,
            buildingId: building.id,
            number:     aptNum,
            floor:      floor,
            area:       area,
            rooms:      areaToRooms(area),
            shareRatio: share,
            residents:  pick([1, 1, 2, 2, 2, 3, 3, 4]),
          },
        });

        // Create owner for ~70% of units
        const ownershipIds: string[] = [];
        if (Math.random() < 0.70) {
          const ownerEmail = `owner.${slug(a.neighborhood)}.${u + 1}@demo.ro`;
          const ownerUser = await prisma.user.upsert({
            where: { email: ownerEmail },
            update: {},
            create: {
              email:        ownerEmail,
              fullName:     roName(),
              passwordHash: await hash("Owner123!"),
              emailVerified: true,
              isActive:     true,
            },
          });
          const ownershipId = `own-${unitId}`;
          await prisma.ownership.upsert({
            where: { id: ownershipId },
            update: {},
            create: {
              id:        ownershipId,
              unitId:    unit.id,
              userId:    ownerUser.id,
              type:      "OWNER",
              startDate: new Date("2022-01-01"),
              isActive:  true,
            },
          });
          ownershipIds.push(ownershipId);
        }

        allUnitsInfo.push({ unitId: unit.id, shareRatio: share, area, residents: unit.residents ?? 2, ownerships: ownershipIds });
      }
    }

    // Totals for distribution
    const totalShareRatio = allUnitsInfo.reduce((s, u) => s + u.shareRatio, 0);
    const totalArea       = allUnitsInfo.reduce((s, u) => s + u.area,       0);
    const totalResidents  = allUnitsInfo.reduce((s, u) => s + u.residents,  0);
    const unitCount       = allUnitsInfo.length;
    const totals          = { shareRatio: totalShareRatio, area: totalArea, residents: totalResidents, unitCount };

    // Expense periods: Jan–Mar 2026 FINALIZED, Apr 2026 DRAFT
    const MONTHS: { month: number; year: number; status: PeriodStatus }[] = [
      { month: 1, year: 2026, status: "FINALIZED" },
      { month: 2, year: 2026, status: "FINALIZED" },
      { month: 3, year: 2026, status: "FINALIZED" },
      { month: 4, year: 2026, status: "DRAFT"     },
    ];

    for (const { month, year, status } of MONTHS) {
      const periodId = `per-${a.id}-${year}-${month}`;
      const period = await prisma.expensePeriod.upsert({
        where:  { associationId_year_month: { associationId: association.id, year, month } },
        update: {},
        create: {
          id:            periodId,
          associationId: association.id,
          year,
          month,
          status,
          createdBy:     mgrUser.id,
          generatedAt:   status === "FINALIZED" ? new Date(`2026-0${month}-28`) : null,
        },
      });

      const expenses = expensesForMonth(month, unitCount);
      const expenseRecords: { id: string; totalAmount: number; distributionType: string }[] = [];

      for (let ei = 0; ei < expenses.length; ei++) {
        const exp = expenses[ei];
        const expId = `exp-${a.id}-${year}-${month}-${ei}`;
        const created = await prisma.expense.upsert({
          where:  { id: expId },
          update: {},
          create: {
            id:               expId,
            periodId:         period.id,
            category:         exp.category,
            description:      exp.description,
            totalAmount:      exp.totalAmount,
            distributionType: exp.distributionType,
          },
        });
        expenseRecords.push({ id: created.id, totalAmount: created.totalAmount, distributionType: created.distributionType });
      }

      // Generate payment items for FINALIZED periods (only ownerships that exist)
      if (status === "FINALIZED") {
        // Delete any existing payment items
        await prisma.paymentItem.deleteMany({ where: { periodId: period.id } });

        // shareMap: ownershipId → amount
        const shareMap = new Map<string, number>();
        for (const u of allUnitsInfo) {
          for (const owId of u.ownerships) {
            shareMap.set(owId, 0);
          }
        }

        for (const exp of expenseRecords) {
          for (const u of allUnitsInfo) {
            if (u.ownerships.length === 0) continue;
            const unitShare = distributeExpense(exp.totalAmount, exp.distributionType, u, totals);
            const perOwner = unitShare / u.ownerships.length;
            for (const owId of u.ownerships) {
              shareMap.set(owId, (shareMap.get(owId) ?? 0) + perOwner);
            }
          }
        }

        const payItems: { ownershipId: string; unitAmount: number }[] = [];
        for (const [ownershipId, amount] of Array.from(shareMap.entries())) {
          payItems.push({ ownershipId, unitAmount: Math.round(amount * 100) / 100 });
        }

        // Simulate some payments (paid, partial, overdue)
        const STATUSES: ("PAID" | "PARTIAL" | "PENDING" | "OVERDUE")[] = ["PAID", "PAID", "PAID", "PARTIAL", "PENDING", "OVERDUE"];
        for (const item of payItems) {
          const st = pick(STATUSES);
          const paidAmount =
            st === "PAID"    ? item.unitAmount :
            st === "PARTIAL" ? Math.round(item.unitAmount * rnd(0.3, 0.8) * 100) / 100 :
            0;

          await prisma.paymentItem.create({
            data: {
              periodId:     period.id,
              ownershipId:  item.ownershipId,
              unitAmount:   item.unitAmount,
              previousDebt: 0,
              totalDue:     item.unitAmount,
              paidAmount,
              paidAt:       paidAmount === item.unitAmount ? new Date(`2026-0${month < 10 ? "0"+month : month}-15`) : null,
              status:       st,
            },
          });
        }
      }
    }

    const aptCount = allUnitsInfo.length;
    console.log(`✅ ${a.name} — ${aptCount} apartamente`);
  }

  // Demo manager: mandates for 7 associations to test the association switcher
  const DEMO_MGR_ASSOCS = ["assoc-av1", "assoc-dor1", "assoc-flo1", "assoc-col1", "assoc-ban1", "assoc-tit1", "assoc-her1"];
  for (const assocId of DEMO_MGR_ASSOCS) {
    await prisma.mandate.upsert({
      where:  { id: `mnd-demo-${assocId}` },
      update: {},
      create: {
        id:            `mnd-demo-${assocId}`,
        associationId: assocId,
        userId:        demoManager.id,
        role:          UserRole.MANAGER,
        startDate:     new Date("2025-01-01"),
        isActive:      true,
      },
    });
  }
  console.log(`✅ manager@demo.ro — ${DEMO_MGR_ASSOCS.length} mandate active`);

  console.log("\n🎉 Seed complet!\n");
  console.log("Conturi de test:");
  console.log("  superadmin@bloc-uat.local          / SuperAdmin123!");
  console.log("  operator@sector1.ro               / Operator123!");
  console.log("  manager@demo.ro                   / Manager123!  (7 asociații)");
  console.log("  manager.<cartier>@demo.ro         / Manager123!");
  console.log("  owner.<cartier>.<nr>@demo.ro      / Owner123!");

  // ── 100 cetățeni / proprietari de test ───────────────────────────────────────
  await seedCivicUsers(hash, uat.id);

  // ── 5 Școli reale Sector 1 ───────────────────────────────────────────────────
  await seedSchools(uat.id);

  // ── RBAC dinamic ─────────────────────────────────────────────────────────────
  await seedRBAC(hash);

  // ── Grilă evaluare ────────────────────────────────────────────────────────────
  await seedEvaluationGrid(superAdmin.id);
}

main()
  .catch(e => { console.error("❌ Seed error:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
