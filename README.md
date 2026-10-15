# 🏛️ Overseer Lexicon

A fast, lightweight, multilingual dictionary application cataloging terminology for **overseers, wardens, curators, and stewards** across world history, ancient civilizations, and diverse cultures.

Built with **Next.js 16 (App Router)**, **React 19**, and Node.js 22's native **`node:sqlite`** embedded database engine. Zero external component libraries, zero heavy dependencies.

---

## 🌟 Key Features

- **⚡ Fast Embedded SQLite with FTS5**: Powered by Node 22 native `node:sqlite` (`DatabaseSync`), Write-Ahead Logging (`WAL`), and SQLite FTS5 full-text indexing for instant prefix and substring searches.
- **🔍 Faceted Live Filters**: Filter dynamically across **Region**, **Historical Era**, **Functional Domain**, **Writing Script**, and **Starred / Favorites**.
- **🗂️ Dual View Modes**: Instant switching between an expansive **Card View** and a compact, scannable **Table View**.
- **📜 Infinite Scroll & Lazy Loading**: Smooth windowing displaying 18 items per page with automatic Intersection Observer triggers as you scroll down.
- **🎲 "I'm Feeling Lucky" Spotlight**: Click the shuffle button to open a full-screen spotlight card highlighting a random steward term, definition, domain badges, and phonetic romanization, with keyboard navigation (`Esc`) and instant cycling (`Next Lucky Term`).
- **👤 User Registration & Personal Bookmarks**: Users can register an account, sign in, and save/bookmark specific terms to their personal collection, securely persisted in SQLite (`user_stars`) with cryptographic salt + scrypt password hashing and HTTP-only sessions.
- **⭐ Saved Terms Filter & Sync**: Filter terms to view only your bookmarked terms, with seamless automatic syncing of locally favorited terms upon registration or sign-in.
- **📥 Bulk Term Importer**: Built-in modal dialog to paste and preview pipe-delimited terms, validate schemas, detect duplicates in real-time, and choose between *Skip* or *Update* conflict resolution.
- **🤖 AI Term Generator & Rule Engine**: Embedded historical taxonomy ([RULES.md](file:///mnt/dev_workspace/fun-projects/thelexicon/RULES.md)) and CLI tool to generate, validate, and batch-import hundreds of culturally authentic terms using Gemini or manual LLM prompting.
- **🔊 Native-Tongue Voice Output (TTS)**: Built-in speech synthesis automatically pronouncing each term in its native language (100+ languages mapped including Latin, Ancient Greek, Japanese, Arabic, German, Hindi, etc.) with smart phonetic romanization fallbacks and keyboard shortcuts (`P` / `L` in spotlight).
- **🎨 Pure Responsive CSS**: Modern, typography-first aesthetic with dark/light themes and zero CSS-in-JS runtime overhead.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router, Turbopack)
- **UI Library**: [React 19](https://react.dev)
- **Database**: Node.js 22 Native SQLite (`node:sqlite` `DatabaseSync`)
- **Search Engine**: SQLite FTS5 (Full-Text Search 5)
- **Styling**: Native CSS Variables & Modern Flex/Grid Layouts
- **Package Manager**: [pnpm](https://pnpm.io)

---

## 📋 Prerequisites

- **Node.js**: `v22.5.0` or higher (required for native `node:sqlite`)
- **Package Manager**: `pnpm` (recommended), `npm`, or `bun`

---

## 🚀 Quick Start

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/your-username/thelexicon.git
cd thelexicon
pnpm install
```

### 2. Initialize Database & Seed Terms

Seed the database from the curated collection in `src/data/overseer.json`:

```bash
pnpm seed
```

This creates and configures `data/lexicon.db` with FTS5 indexes and initial records.

### 3. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production

```bash
pnpm build
pnpm start
```

---

## 🤖 Generating & Importing Terms

Overseer Lexicon includes a dedicated CLI utility ([scripts/generate-terms.mjs](file:///mnt/dev_workspace/fun-projects/thelexicon/scripts/generate-terms.mjs)) and an authoritative rulebook ([RULES.md](file:///mnt/dev_workspace/fun-projects/thelexicon/RULES.md)) to generate high-quality entries while avoiding duplicates.

### 1. View or Export Formatted Prompts
Print the complete system prompt, taxonomic codes, and negative constraint list (terms already in the database) to use with any AI chat UI (Gemini, ChatGPT, Claude):

```bash
# Print prompt to console
pnpm generate --prompt

# Save prompt to file with custom focus and count
pnpm generate --prompt --focus="maritime & harbor wardens" --count=50 --out=prompt.txt
```

### 2. Direct Gemini Generation (CLI)
Configure your Gemini API key in `.env.local`:

```bash
echo "GEMINI_API_KEY=your_gemini_api_key_here" >> .env.local
```

Generate terms and review them in terminal:
```bash
pnpm generate --generate --count=30 --focus="ancient temple guardians" --model=gemini-2.5-flash
```

Generate and save directly into SQLite with duplicate detection:
```bash
pnpm generate --generate --count=50 --save --dup-mode=term_language --on-dup=skip
```

### 3. File Import & Pre-packaged Datasets
Import any raw pipe-delimited text file into the database:

```bash
# Import mythological creatures dataset
pnpm seed:creatures

# Import any custom file
pnpm generate --import=path/to/terms.txt --save
```

### 4. Web UI Bulk Importer
Click the **"Import Terms"** button in the app header to open the interactive modal. You can paste raw pipe-delimited entries, inspect validation errors, preview duplicates, and import with a single click.

---

## 📐 Data Format Specification

Each term must follow the 7-column pipe-separated format:

```text
term|romanization|language|region|era|domain|gloss
```

### Example Entries:
```text
archon|árchōn|Ancient Greek|EUR|A|STATE|Chief magistrate or presiding ruler of a Greek city-state.
muhtasib|muḥtasib|Classical Arabic|MEA|M|TRADE|Inspector of public markets, weights, measures, and public morals.
gubernator|gubernātor|Latin|EUR|A|PORT|Helmsman, ship pilot, and navigational overseer.
```

### Taxonomy Codes Reference

| Field | Code | Value |
|---|---|---|
| **Region** | `EUR` | Europe |
| | `MEA` | Middle East |
| | `CAS` | Central Asia & Caucasus |
| | `SAS` | South Asia |
| | `EAS` | East Asia |
| | `SEAS` | Southeast Asia |
| | `OCE` | Oceania |
| | `AFR` | Africa |
| | `AME` | Americas |
| **Era** | `A` | Ancient (pre-500 CE) |
| | `M` | Historic / Medieval / Pre-Modern (500–1800 CE) |
| | `N` | Modern (1800 CE–present) |
| **Domain** | `STUDIO` | Workshop & studio |
| | `GALLERY` | Gallery & museum |
| | `OFFICE` | Office & business |
| | `HOUSE` | Household & estate |
| | `LAND` | Land & farming |
| | `STATE` | State & civil |
| | `FINANCE` | Treasury & finance |
| | `TRADE` | Trade & market |
| | `RELIGION` | Religious & temple |
| | `EDUCATION` | Library & school |
| | `PERFORM` | Performing arts |
| | `PORT` | Ships & ports |
| | `MILITARY` | Military |
| | `LEAD` | General leadership |

For complete guidelines on tone, transliteration, and quality control, see [RULES.md](file:///mnt/dev_workspace/fun-projects/thelexicon/RULES.md).

---

## 🚢 Deployment

The repository includes production-ready container configurations and deployment guides:

- **Docker**: Ready-to-run [Dockerfile](file:///mnt/dev_workspace/fun-projects/thelexicon/Dockerfile) and [docker-compose.yml](file:///mnt/dev_workspace/fun-projects/thelexicon/docker-compose.yml) with automatic volume mounting (`data/` directory).
- **Linux VPS / PaaS**: Detailed setup guides for systemd, Nginx reverse proxy, Fly.io NVMe persistent volumes, Railway, and automated SQLite hot backups (`VACUUM INTO`).

👉 Read the full **[Deployment Guide (DEPLOYMENT.md)](file:///mnt/dev_workspace/fun-projects/thelexicon/DEPLOYMENT.md)** for step-by-step instructions.

---

## 📁 Repository Structure

```text
├── DEPLOYMENT.md              # Production deployment & operations guide
├── Dockerfile                 # Multi-stage production Docker container
├── docker-compose.yml         # Container orchestration with persistent volume
├── RULES.md                   # AI agent prompt rules & historical taxonomy
├── README.md                  # Project overview & documentation
├── data/
│   ├── lexicon.db             # SQLite database (git-ignored, generated on seed)
│   └── mythological-creatures.txt  # Sample import dataset
├── scripts/
│   ├── seed.mjs               # Seeds database from overseer.json
│   └── generate-terms.mjs     # CLI for AI generation, validation & imports
└── src/
    ├── app/
    │   ├── api/               # Next.js route handlers (search, terms, star, import, stats)
    │   ├── globals.css        # Application styling and theme variables
    │   ├── layout.tsx         # Root layout with metadata and font configurations
    │   └── page.tsx           # Main lexicon client UI (search, filters, lazy loading, spotlight)
    ├── data/
    │   └── overseer.json      # Baseline curated dataset
    └── lib/
        └── db.ts              # Native SQLite connection, migrations, FTS5 virtual tables
```

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).
