# GHID INSTALARE — Windows (de la zero)

Acest ghid te duce de la un calculator fără nimic instalat până la
aplicație funcțională în browser, pas cu pas.

---

## PASUL 1 — Instalare Node.js

Node.js este motorul care rulează aplicația.

1. Mergi la https://nodejs.org
2. Descarcă versiunea **LTS** (cea recomandată, cu număr par — ex: 20.x sau 22.x)
3. Rulează installerul descărcat (`.msi`)
4. Bifează opțiunea **"Add to PATH"** dacă apare
5. Finalizează instalarea

**Verificare** — deschide Command Prompt (Win+R → `cmd` → Enter) și scrie:
```
node --version
npm --version
```
Ar trebui să apară ceva de genul `v20.x.x` și `10.x.x`.

---

## PASUL 2 — Instalare Git

Git este sistemul de versionare a codului.

1. Mergi la https://git-scm.com/download/win
2. Descarcă și rulează installerul
3. La toate opțiunile, poți lăsa valorile implicite
4. La "Choosing the default editor", poți selecta Notepad dacă nu știi ce altceva

**Verificare:**
```
git --version
```

---

## PASUL 3 — Instalare VS Code

VS Code este editorul de cod pe care îl vom folosi.

1. Mergi la https://code.visualstudio.com
2. Descarcă și instalează
3. La instalare, bifează **"Add to PATH"** și **"Open with Code"** (contextual menu)

---

## PASUL 4 — Instalare Docker Desktop

Docker rulează baza de date PostgreSQL și Redis local, fără instalare complexă.

1. Mergi la https://www.docker.com/products/docker-desktop
2. Descarcă **Docker Desktop for Windows**
3. Instalează și **repornește calculatorul** dacă cere
4. Deschide Docker Desktop după repornire și așteaptă să pornească (iconița din tray devine stabilă)

**Verificare** (după repornire, în Command Prompt):
```
docker --version
docker compose version
```

---

## PASUL 5 — Copierea proiectului pe calculator

Ai deja folderul `bloc-uat` cu toate fișierele de la mine. Copiază-l unde vrei —
recomandat `C:\Proiecte\bloc-uat` sau direct pe Desktop.

Alternativ, dacă ai primit codul ca arhivă ZIP, dezarhivează-l acolo.

---

## PASUL 6 — Deschide proiectul în VS Code

1. Deschide VS Code
2. File → Open Folder → selectează folderul `bloc-uat`
3. Dacă apare un prompt "Do you trust the authors?", click **Yes, I trust the authors**

---

## PASUL 7 — Deschide terminalul integrat în VS Code

În VS Code: **View → Terminal** (sau `` Ctrl+` ``)

Un terminal se va deschide în josul ecranului, deja poziționat în folderul proiectului.
**Toate comenzile de mai jos le rulezi în acest terminal.**

---

## PASUL 8 — Instalare dependențe Node

```bash
npm install
```

Aceasta descarcă toate librăriile necesare (poate dura 1-3 minute prima dată).

---

## PASUL 9 — Configurare variabile de mediu

În terminal:
```bash
copy .env.example .env.local
```

Deschide fișierul `.env.local` (apare în lista din stânga VS Code) și modifică:
```
AUTH_SECRET="scrie-orice-sir-lung-aleatoriu-de-minimum-32-caractere"
```

Poți genera un secret random pe https://generate-secret.vercel.app/32 sau folosești:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
Copiază rezultatul și pune-l ca valoare pentru AUTH_SECRET.

Restul valorilor din `.env.local` sunt deja configurate pentru development local.

---

## PASUL 10 — Pornire baze de date (PostgreSQL + Redis)

Asigură-te că **Docker Desktop este pornit** (iconița balenei în tray).

```bash
docker compose up -d
```

Prima dată descarcă imaginile (~500MB), durează câteva minute.
Verificare:
```bash
docker compose ps
```
Ar trebui să vezi `blocuat_postgres` și `blocuat_redis` cu starea `running`.

---

## PASUL 11 — Inițializare bază de date

Creează tabelele din schema Prisma:
```bash
npx prisma migrate dev --name init
```

Dacă apare eroarea `"Environment variable not found: DATABASE_URL"`,
asigură-te că ai creat `.env.local` la Pasul 9.

Adaugă datele inițiale (UAT, conturi de test):
```bash
npm run db:seed
```

---

## PASUL 12 — Pornire aplicație

```bash
npm run dev
```

Deschide browserul și mergi la: **http://localhost:3000**

---

## CONTURI DE TEST (create de seed)

| Email | Parolă | Rol |
|-------|--------|-----|
| superadmin@bloc-uat.local | SuperAdmin123! | Super Admin |
| operator@sector1.ro | Operator123! | Operator UAT |
| administrator@demo.ro | Admin123! | Administrator |
| proprietar@demo.ro | Proprietar123! | Proprietar |

---

## COMENZI UTILE (rulate din terminalul VS Code)

```bash
# Pornire aplicație (development, cu hot reload)
npm run dev

# Pornire baze de date
docker compose up -d

# Oprire baze de date
docker compose down

# Interfață vizuală pentru baza de date (se deschide în browser)
npm run db:studio

# Aplicare migrații după modificări în schema.prisma
npx prisma migrate dev --name descriere_modificare

# Regenerare client Prisma după modificări schema
npm run db:generate

# Resetare completă bază de date (ȘTERGE TOATE DATELE)
npx prisma migrate reset
```

---

## REZOLVARE PROBLEME FRECVENTE

**"Cannot find module" sau erori la import**
→ Rulează `npm install` din nou

**"Connection refused" la baza de date**
→ Verifică că Docker Desktop e pornit, apoi `docker compose up -d`

**Port 3000 ocupat**
→ Next.js va folosi automat 3001. Accesează http://localhost:3001

**Port 5432 ocupat (PostgreSQL)**
→ Ai deja un PostgreSQL instalat local. Fie oprești serviciul existent,
  fie modifici portul din docker-compose.yml (ex: "5433:5432") și din .env.local

**Eroare la migrate: "role does not exist"**
→ Containerul nu e pornit. Rulează `docker compose up -d` și re-încearcă

**Ecran alb în browser**
→ Verifică terminalul — ar trebui să nu fie erori roșii.
  Dacă sunt, copiază eroarea și trimite-mi-o.

---

## STRUCTURA PROIECTULUI (referință rapidă)

```
bloc-uat/
├── prisma/
│   ├── schema.prisma        ← toate tabelele bazei de date
│   └── seed.ts              ← date inițiale de test
├── src/
│   ├── app/                 ← pagini (Next.js App Router)
│   │   ├── (auth)/login/    ← pagina de autentificare
│   │   ├── (dashboard)/     ← paginile protejate
│   │   └── api/auth/        ← endpoint NextAuth
│   ├── components/
│   │   └── layout/          ← Sidebar, TopBar
│   ├── lib/
│   │   ├── auth.ts          ← configurare NextAuth + ROeID
│   │   ├── prisma.ts        ← client bază de date
│   │   ├── rbac.ts          ← roluri și permisiuni
│   │   └── audit.ts         ← jurnal audit
│   ├── middleware.ts         ← protecție rute
│   └── types/               ← tipuri TypeScript
├── .env.example             ← template variabile mediu
├── docker-compose.yml       ← PostgreSQL + Redis local
└── package.json
```
