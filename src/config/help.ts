// src/config/help.ts — Contextual help content, matched by route.
// Entries are checked in order; put more specific routes first.

export interface HelpSection {
  title: string;
  body: string; // Lines starting with "- " are rendered as bullets
}

export interface HelpContent {
  pageTitle: string;
  intro?: string;
  sections: HelpSection[];
}

export interface HelpEntry {
  match: (path: string) => boolean;
  content: HelpContent;
}

export const HELP_ENTRIES: HelpEntry[] = [

  // ── UAT ────────────────────────────────────────────────────────────────────

  {
    match: (p) => p === "/uat/associations/new",
    content: {
      pageTitle: "Înregistrare asociație nouă",
      intro: "Formular de înregistrare directă folosit de operatorii UAT pentru a introduce o asociație în sistem fără a parcurge fluxul public.",
      sections: [
        {
          title: "Date asociație",
          body: "- Denumirea completă trebuie să corespundă cu cea din actul constitutiv.\n- CIF-ul (codul fiscal) trebuie să fie unic în platformă — 4 până la 10 cifre.\n- Adresa se poate auto-completa din lista stradală Sector 1.",
        },
        {
          title: "Stare inițială",
          body: "- «Activă» — asociația este validată imediat și apare în registrul public.\n- «În așteptare» — dosarul intră în flux de verificare și trebuie aprobat ulterior.",
        },
        {
          title: "Președinte, Administrator, Cenzor",
          body: "- Fiecare rol are o secțiune separată cu selector «Persoană fizică / Persoană juridică».\n- Persoane fizice: completați nume, prenume și atașați copie CI.\n- Persoane juridice: completați denumire, CUI, adresă sediu, reprezentant legal și copie certificat înregistrare.\n- Aceste date sunt obligatorii pentru validarea dosarului.",
        },
        {
          title: "Comitet executiv",
          body: "- Minim 2 membri, maxim 6.\n- Puteți include în comitet și persoanele înregistrate ca Președinte, Administrator sau Cenzor.\n- Câmpurile sunt opționale pentru membri — le puteți completa ulterior din dosarul asociației.",
        },
        {
          title: "Acte obligatorii",
          body: "- Statut / act constitutiv, dosar judecătorie și mandat președinte pot fi uploadate acum sau adăugate ulterior.\n- Documentele uploadate sunt atașate automat la secțiunea «Documente asociație» din dosarul ei.",
        },
      ],
    },
  },

  {
    match: (p) => /^\/uat\/associations\/[^/]/.test(p),
    content: {
      pageTitle: "Dosarul asociației",
      intro: "Pagina centrală de gestiune a unei asociații de proprietari — stare, conducere, documente, platformă și structura blocului.",
      sections: [
        {
          title: "Stare și flux de aprobare",
          body: "- Asociațiile în stare «În așteptare», «În verificare» sau «Necesită completare» afișează panoul de review în partea de sus.\n- «Cere completare» trimite un link securizat reprezentantului pentru a adăuga datele lipsă.\n- «Validează» activează asociația — necesită Președinte, Administrator, Cenzor și minim 2 membri CEX.\n- «Respinge» arhivează definitiv dosarul și cere un motiv obligatoriu.",
        },
        {
          title: "Conducere înregistrată",
          body: "- Rezumat read-only al datelor din dosarul de înregistrare.\n- Folosiți secțiunea «Editare conducere» de mai jos pentru a modifica sau completa datele.",
        },
        {
          title: "Documente în așteptare",
          body: "- Apare doar când managerul a uplodat documente care necesită aprobarea operatorului.\n- Deschideți fișierul înainte de a decide.\n- «Aprobă» → documentul devine PUBLISHED și vizibil proprietarilor.\n- «Respinge» → documentul este arhivat; puteți adăuga un motiv.",
        },
        {
          title: "Documente asociație",
          body: "- Gestionați actele oficiale: statut, dosar judecătorie, mandat, CI președinte etc.\n- «Înlocuiește» → uploadați un fișier nou sau lipiți un URL extern (Google Drive, OneDrive).\n- Documentele lipsă sunt marcate cu eticheta portocalie «Lipsă».",
        },
        {
          title: "Editare conducere",
          body: "- Actualizați separat fiecare secțiune: Președinte, Administrator, Cenzor, Comitet executiv.\n- Datele se salvează imediat după confirmare.\n- Modificările sunt înregistrate în jurnalul de audit.",
        },
        {
          title: "Conturi platformă",
          body: "- Afișează utilizatorii cu mandat activ (Manager, Președinte CA).\n- Puteți adăuga un mandat nou asociind un cont existent sau creând unul.\n- Revocarea unui mandat dezactivează accesul utilizatorului la această asociație.",
        },
        {
          title: "Scări și apartamente",
          body: "- Adăugați scările (clădirile) din care este formată asociația.\n- Fiecare scară poate conține apartamente cu număr, etaj, suprafață și camere.\n- Datele sunt utilizate pentru adeverințe și gestionarea proprietarilor.",
        },
      ],
    },
  },

  {
    match: (p) => p === "/uat/associations" || p.startsWith("/uat/associations?"),
    content: {
      pageTitle: "Lista asociațiilor",
      intro: "Registrul complet al asociațiilor de proprietari din Sectorul 1, cu filtrare și acces rapid la dosare.",
      sections: [
        {
          title: "Stările unui dosar",
          body: "- «În așteptare» — dosar depus, neprocesat.\n- «În verificare» — operatorul a preluat dosarul.\n- «Necesită completare» — s-a trimis link de completare.\n- «Activ» — asociație validată, vizibilă public.\n- «Respins» — dosar arhivat definitiv.\n- «Suspendat» — activitate temporar oprită.",
        },
        {
          title: "Înregistrare directă",
          body: "Butonul «+ Asociație nouă» permite operatorilor să înregistreze direct o asociație, fără a folosi formularul public.",
        },
        {
          title: "Acces la dosar",
          body: "Faceți clic pe orice rând din tabel pentru a deschide dosarul complet al asociației.",
        },
      ],
    },
  },

  {
    match: (p) => p.startsWith("/uat/map"),
    content: {
      pageTitle: "Harta asociațiilor",
      sections: [
        {
          title: "Ce afișează harta",
          body: "Localizarea geografică a tuturor asociațiilor active pentru care au fost salvate coordonate GPS.",
        },
        {
          title: "Geocodare lipsă",
          body: "Dacă o asociație nu apare pe hartă, deschideți dosarul ei și folosiți funcția de geocodare automată din câmpul de adresă.",
        },
      ],
    },
  },

  {
    match: (p) => p.startsWith("/uat/audit"),
    content: {
      pageTitle: "Jurnal de audit",
      sections: [
        {
          title: "Ce înregistrează jurnalul",
          body: "Toate acțiunile efectuate de operatori: aprobări, modificări de conducere, upload documente, validări, respingeri.",
        },
        {
          title: "Filtrare și export",
          body: "Filtrați după operator, tip acțiune sau interval de date. Utili pentru audit intern sau rapoarte de activitate.",
        },
      ],
    },
  },

  {
    match: (p) => p.startsWith("/uat/reports"),
    content: {
      pageTitle: "Rapoarte UAT",
      sections: [
        {
          title: "Rapoarte disponibile",
          body: "- Distribuție asociații pe cartier și stare.\n- Situația dosarelor incomplete.\n- Activitatea operatorilor pe perioadă.",
        },
      ],
    },
  },

  {
    match: (p) => p.startsWith("/uat/import"),
    content: {
      pageTitle: "Import date",
      sections: [
        {
          title: "Import în masă",
          body: "Permite adăugarea mai multor asociații simultan dintr-un fișier CSV sau Excel. Util la migrarea datelor din sisteme anterioare.",
        },
        {
          title: "Pași",
          body: "- Descărcați șablonul de import.\n- Completați datele conform instrucțiunilor din fișier.\n- Uploadați fișierul și verificați raportul de validare înainte de import.",
        },
      ],
    },
  },

  {
    match: (p) => p === "/uat" || p === "/uat/",
    content: {
      pageTitle: "Panoul de control UAT",
      intro: "Panoul principal al operatorilor UAT Sector 1. De aici monitorizați și gestionați toate asociațiile de proprietari.",
      sections: [
        {
          title: "Dosare care necesită acțiune",
          body: "Asociațiile în stare «În așteptare» sau «Necesită completare» sunt prioritizate și afișate distinct pentru procesare rapidă.",
        },
        {
          title: "Statistici",
          body: "- Total asociații active, în verificare, în așteptare.\n- Activitate recentă din jurnalul de audit.",
        },
        {
          title: "Navigare rapidă",
          body: "- «Asociații» — lista completă cu filtrare.\n- «+ Asociație nouă» — înregistrare directă ca operator.\n- «Hartă» — distribuție geografică.\n- «Jurnal audit» — istoric acțiuni.",
        },
      ],
    },
  },

  // ── Documente ──────────────────────────────────────────────────────────────

  {
    match: (p) => p === "/documente/nou",
    content: {
      pageTitle: "Document nou",
      sections: [
        {
          title: "Categorie și folder",
          body: "- Categoria descrie tipul documentului (ex: Proces verbal, Contract, Factură).\n- Folderul este opțional și ajută la organizare — puteți crea unul nou direct din câmp.\n- Puteți folosi categorii predefinite sau specifica una personalizată cu «Altele».",
        },
        {
          title: "Fișier sau link extern",
          body: "- Uploadați un fișier (PDF, Word, Excel, imagine) sau lipiți un URL extern (Google Drive, OneDrive, Dropbox).\n- Titlul se completează automat cu numele fișierului uplodat dacă lăsați câmpul gol.",
        },
        {
          title: "Stare și vizibilitate",
          body: "- «Ciornă» — salvat dar nevizibil pentru proprietari.\n- «Publicat» — vizibil, dar doar dacă bifați și «Vizibil proprietarilor».\n- Puteți seta o dată de expirare pentru documente temporare (ex: autorizații, contracte).",
        },
      ],
    },
  },

  {
    match: (p) => /^\/documente\/[^/]+$/.test(p) && p !== "/documente/nou",
    content: {
      pageTitle: "Editare document",
      sections: [
        {
          title: "Ce puteți modifica",
          body: "Titlu, categorie, folder, descriere, dată document, dată expirare, stare publicare și fișierul atașat.",
        },
        {
          title: "Înlocuire fișier",
          body: "Uploadul unui fișier nou înlocuiește fișierul existent. Linkul vechi nu mai funcționează după înlocuire.",
        },
        {
          title: "Ștergere",
          body: "Butonul «Șterge» elimină definitiv documentul din platformă. Acțiunea nu poate fi anulată.",
        },
      ],
    },
  },

  {
    match: (p) => p === "/documente" || p === "/documente/",
    content: {
      pageTitle: "Documente",
      intro: "Biblioteca de documente oficiale ale asociației — procese verbale, hotărâri, contracte, rapoarte financiare.",
      sections: [
        {
          title: "Organizare pe foldere",
          body: "- Bara laterală stângă afișează toate folderele create.\n- «Toate documentele» afișează întreaga bibliotecă.\n- «Neclasificate» grupează documentele fără folder.\n- Creați un folder nou direct din bara laterală cu «+ Folder nou».",
        },
        {
          title: "Filtrare",
          body: "- Filtrați după categorie (chips-uri colorate), stare sau interval de date.\n- Combinați mai mulți filri simultan pentru căutări precise.",
        },
        {
          title: "Vizibilitate pentru proprietari",
          body: "Proprietarii văd numai documentele marcate «Publicat» + «Vizibil proprietarilor». Ciornele sunt vizibile exclusiv pentru manager și operatorul UAT.",
        },
        {
          title: "Aprobare operator",
          body: "Documentele uploadate cu starea «Ciornă» apar în panoul operatorului UAT sub «Documente în așteptare» și necesită aprobare înainte de a fi publicate.",
        },
      ],
    },
  },

  // ── Locatari ───────────────────────────────────────────────────────────────

  {
    match: (p) => p === "/locatari" || p === "/locatari/",
    content: {
      pageTitle: "Locatari și proprietari",
      intro: "Gestionați proprietarii, co-proprietarii și locatarii fiecărui apartament din asociație.",
      sections: [
        {
          title: "Structura bloc",
          body: "Selectați scara din bara laterală stângă pentru a vedea lista apartamentelor. Fiecare apartament afișează proprietarul activ și tipul de ocupare.",
        },
        {
          title: "Adăugare proprietar",
          body: "- Faceți clic pe «+ Proprietar» lângă apartamentul dorit.\n- Introduceți nume, email și telefon.\n- Selectați tipul: Proprietar principal sau Co-proprietar.\n- Emailul permite trimiterea invitației de activare cont.",
        },
        {
          title: "Invitație pe platformă",
          body: "- Editați un proprietar existent și apăsați «Trimite invitație».\n- Dacă SMTP este configurat, emailul se trimite automat.\n- Altfel apare un link pe care îl puteți copia și transmite direct.",
        },
        {
          title: "Apartament sediu firmă",
          body: "Bifați «Sediu social» dacă apartamentul este înregistrat ca sediu al unei firme. Completați denumirea și CUI-ul. Apartamentul va fi marcat cu etichetă violet în tabel.",
        },
        {
          title: "Adăugare apartament",
          body: "- Dacă structura blocului nu este completă, adăugați apartamente cu «+ Apartament».\n- Completați numărul, etajul, suprafața și numărul de camere.\n- Tipul de încălzire este opțional.",
        },
      ],
    },
  },

  // ── Adeverințe ─────────────────────────────────────────────────────────────

  {
    match: (p) => p.startsWith("/adeverinte"),
    content: {
      pageTitle: "Adeverințe",
      intro: "Emiteți și gestionați adeverințe oficiale pentru proprietarii asociației.",
      sections: [
        {
          title: "Tipuri de adeverințe",
          body: "- «Plăți la zi» — confirmă absența restanțelor la întreținere.\n- «Proprietate» — confirmă dreptul de proprietate / folosință.\n- «Fond de rulment» — confirmă achitarea fondului de rulment.\n- «Generală» — text standard pentru alte situații.",
        },
        {
          title: "Procesul de emitere",
          body: "- Proprietarul depune o cerere din contul său.\n- Managerul sau Președintele CA aprobă cererea.\n- Adeverința primește un număr de înregistrare automat.",
        },
        {
          title: "PDF și tipar",
          body: "- Deschideți adeverința aprobată și apăsați «Tipărește».\n- Bara laterală și meniul nu apar la imprimare — documentul iese curat cu antetul asociației.\n- Adeverința conține: număr, dată, date proprietar, text legal și secțiuni pentru semnături.",
        },
      ],
    },
  },

  // ── Consultări ─────────────────────────────────────────────────────────────

  {
    match: (p) => p.startsWith("/consultari"),
    content: {
      pageTitle: "Consultări",
      intro: "Organizați voturi și consultări digitale cu proprietarii — pentru lucrări, regulamente sau decizii AGA.",
      sections: [
        {
          title: "Creare consultare",
          body: "- Definiți titlul, descrierea problemei și intervalul de vot.\n- Adăugați cel puțin două opțiuni de răspuns.\n- Proprietarii primesc notificare și pot vota din contul lor.",
        },
        {
          title: "Urmărire rezultate",
          body: "Vedeți în timp real numărul de voturi și distribuția pe opțiuni. La închiderea perioadei, rezultatele sunt blocate și arhivate.",
        },
        {
          title: "Cvorumul",
          body: "Platforma calculează procentul de participare din totalul proprietarilor activi. Verificați dacă cvorumul legal este îndeplinit înainte de a considera decizia valabilă.",
        },
      ],
    },
  },

  // ── Avarii ─────────────────────────────────────────────────────────────────

  {
    match: (p) => p.startsWith("/avarii"),
    content: {
      pageTitle: "Avarii și sesizări",
      intro: "Înregistrați, urmăriți și închideți avariile și sesizările din bloc.",
      sections: [
        {
          title: "Înregistrare avarie",
          body: "- Introduceți titlul, descrierea și localizarea în bloc.\n- Atașați fotografii sau documente relevante.\n- Avariile sunt vizibile pentru toți proprietarii din cont.",
        },
        {
          title: "Stări posibile",
          body: "- «Deschisă» — avarie semnalată, nerezolvată.\n- «În lucru» — s-a intervenit, lucrarea este în curs.\n- «Rezolvată» — problema a fost soluționată.\n- «Închisă» — dosar arhivat.",
        },
        {
          title: "Actualizare stare",
          body: "Folosiți butonul «Actualizează starea» pentru a muta avaria în pasul următor. Puteți adăuga note la fiecare tranziție.",
        },
      ],
    },
  },

  // ── Dashboard ──────────────────────────────────────────────────────────────

  {
    match: (p) => p === "/dashboard" || p === "/dashboard/",
    content: {
      pageTitle: "Dashboard",
      intro: "Ecranul principal al platformei — rezumat de activitate și acces rapid la funcțiile asociației.",
      sections: [
        {
          title: "Statistici rapide",
          body: "- Documente publicate.\n- Consultări active.\n- Avarii deschise.\n- Adeverințe emise recent.",
        },
        {
          title: "Schimbare asociație activă",
          body: "Dacă administrați mai multe asociații, folosiți selectorul din bara laterală stângă pentru a comuta. Toate datele din platformă se actualizează automat la asociația selectată.",
        },
        {
          title: "Notificări",
          body: "Pictograma de clopoțel din bara de sus afișează notificările recente: documente de aprobat, cereri de adeverințe, voturi noi în consultări.",
        },
      ],
    },
  },

  // ── Financiar ──────────────────────────────────────────────────────────────

  {
    match: (p) => p.startsWith("/financiare"),
    content: {
      pageTitle: "Situație financiară",
      sections: [
        {
          title: "Privire generală",
          body: "Modulul financiar centralizează veniturile, cheltuielile și situația fondurilor asociației.",
        },
        {
          title: "Acces",
          body: "Manager, Președinte CA și Auditor pot vizualiza situația financiară. Proprietarii nu au acces la acest modul.",
        },
      ],
    },
  },

  // ── Furnizori ──────────────────────────────────────────────────────────────

  {
    match: (p) => p.startsWith("/furnizori"),
    content: {
      pageTitle: "Furnizori",
      sections: [
        {
          title: "Gestionare furnizori",
          body: "Lista firmelor și persoanelor care prestează servicii pentru asociație: administratori externi, firme de curățenie, instalatori, firme de ascensoare etc.",
        },
        {
          title: "Adăugare furnizor",
          body: "Completați datele firmei (denumire, CUI, contact) și tipul de serviciu prestat. Furnizorii pot fi asociați ulterior cu facturi și lucrări.",
        },
      ],
    },
  },

  // ── Rapoarte ───────────────────────────────────────────────────────────────

  {
    match: (p) => p.startsWith("/rapoarte"),
    content: {
      pageTitle: "Rapoarte",
      sections: [
        {
          title: "Rapoarte disponibile",
          body: "- Dare de seamă anuală.\n- Liste de plată.\n- Situații financiare periodice.\n- Raport de activitate pentru AGA.",
        },
        {
          title: "Export",
          body: "Rapoartele pot fi exportate în format PDF sau Excel pentru arhivare sau prezentare în adunarea generală.",
        },
      ],
    },
  },

  // ── Lucrări ────────────────────────────────────────────────────────────────

  {
    match: (p) => p.startsWith("/lucrari"),
    content: {
      pageTitle: "Lucrări",
      sections: [
        {
          title: "Gestionare lucrări",
          body: "Înregistrați și urmăriți lucrările de întreținere și reparații ale blocului: reabilitare fațadă, înlocuire ascensor, lucrări sanitare etc.",
        },
        {
          title: "Documente aferente",
          body: "Atașați oferte, contracte, procese verbale de recepție și facturi direct la fiecare lucrare.",
        },
      ],
    },
  },

  // ── Facturi ────────────────────────────────────────────────────────────────

  {
    match: (p) => p.startsWith("/facturi"),
    content: {
      pageTitle: "Facturi",
      sections: [
        {
          title: "Gestionare facturi",
          body: "Înregistrați facturile de utilități și servicii ale asociației: energie electrică, gaz, apă, servicii de administrare, lucrări.",
        },
        {
          title: "Asociere furnizor",
          body: "Fiecare factură poate fi asociată cu un furnizor din lista platformei pentru o urmărire completă a cheltuielilor per partener.",
        },
      ],
    },
  },
];
