# EduLoans BRE MCP Server

A premium Model Context Protocol (MCP) server that standardizes and exposes **Education Loan Business Rule Engine (BRE)** logic as callable tools. Designed for integration with AI agents (e.g., Claude Desktop, Cursor), DSAs, fintech platforms, and internal lending portals, this server evaluates student profiles, calculates academic and co-applicant scores, matches eligible lenders, and returns detailed scoring breakdowns.

The core value proposition: **Never build an education loan BRE again. Plug in, call tools, and get precise lending decisions.**

---

## 🚀 Key Features

* **Real-time Profile Scoring**: Evaluations are bucketed into three weighted categories:
  * 🏛️ **University Tier/Grade** (10%): QS rank and approved institution listings.
  * 🎓 **Academic History** (70%): Class 10th, 12th, graduation, exam scores (GRE/GMAT/IELTS/TOEFL), and student pincode.
  * 👥 **Co-Applicant Strength** (20%): Relation, employment type, monthly salary/annual ITR, age, and co-applicant pincode.
* **15-Step Knockout Engine**: Evaluates student profiles against 12 real-world Indian lenders (including PSU Banks, Private Banks, and leading NBFCs) verifying:
  * Age boundaries (student and co-applicant)
  * Minimum academic marks (10th/12th/Graduation >= 50%)
  * CIBIL score thresholds (Student & Co-applicant min 680-700)
  * DPD credit history check
  * Minimum monthly income (Salaried) / Annual ITR (Self-employed)
  * Allowed co-applicant relationship matrices
  * Pincode serviceability & blocked regions (J&K, North East India, Kerala for Avanse)
  * Secured/Unsecured eligibility, LTV boundaries, and maximum loan amounts
  * Strict lender-approved university lists
* **Trigram Fuzzy Search**: Highly performant trigram search built from scratch to query 4,738+ approved institution mappings and 1,473+ global QS-ranked universities with typo tolerance.
* **Built on Modern MCP SDK**: Fully typed and compliant with the latest Model Context Protocol specification running on standard `stdio` transport.

---

## 🛠️ Callable Tools

This server registers **9 distinct tools** with strict JSON Schema input validation:

| Tool Name | Description | Key Input Arguments |
|:---|:---|:---|
| 📋 `evaluate_profile` | **Main BRE Evaluator**: Scores profile & returns matched eligible lenders with loan terms and ineligible lenders with knockout reasons. | Student bio, marks, exam scores, university, co-applicant details, requested amount, collateral. |
| 🔍 `check_university` | Resolves university rank, grade, points, and covered lenders. | `university_name` (fuzzy search) or `qs_rank`. |
| 📍 `check_pincode` | Maps a 6-digit Indian pincode to its Tier (1, 2, or 3) and flags blocked regions. | `pincode`. |
| 🏦 `list_lenders` | Returns the master policy rules, ROI ranges, LTV, and age limits for all 12 lenders. | `loan_type` (Secured / Unsecured) optional filter. |
| ⚙️ `score_breakdown` | Detailed step-by-step scoring breakdown showing each attribute, applied rules, weights, and contributions. | Same input schema as `evaluate_profile`. |
| 📐 `get_scoring_rules` | Exposes the active weights, passing thresholds (>=60), and marks-to-points brackets. | `category` (university, academic, coapplicant, all). |
| 🏫 `search_universities`| Fuzzy searches the master QS university database with typo tolerance. | `query`, `country` (optional), `limit` (default 10). |
| 🗺️ `list_countries` | Details all supported, blocked, and partially covered foreign destinations. | *None* |
| 📚 `list_courses` | Returns supported course levels (UG & PG) and course categories (STEM, MBA, Law, Arts, etc.). | *None* |

---

## ⚙️ Configuration & Claude Desktop Integration

To register this server with your Claude Desktop client, add it to your `claude_desktop_config.json` file:

### Windows Path
`%APPDATA%\Claude\claude_desktop_config.json`

### Configuration Snippet
```json
{
  "mcpServers": {
    "eduloans-bre": {
      "command": "node",
      "args": [
        "C:/Users/priyam/Documents/antigravity/blissful-mendeleev/dist/index.js"
      ],
      "env": {}
    }
  }
}
```

Make sure you run `npm run build` inside the server directory first to compile the TypeScript files before starting Claude.

---

## 📦 Developer Installation & Usage

### Prerequisites
* **Node.js**: v18.0.0 or higher (tested on v22.17.0)
* **npm**: v9.0.0 or higher

### Install Dependencies
```bash
npm install
```

### Build Project
Compiles TypeScript files into standard ES modules (`/dist`) and copies the raw JSON datasets automatically:
```bash
npm run build
```

### Run Server (Stdio Transport)
```bash
npm start
```

### Run Tests
Executes the integration and unit test suite evaluating golden profiles, marks knockouts, and regional blocks:
```bash
npm test
```

---

## 📁 Technical Architecture

```
blissful-mendeleev/
├── src/
│   ├── index.ts                # Server entry point, registers 9 tools
│   ├── types.ts                # All TypeScript interfaces & enums
│   ├── scoring/
│   │   ├── university-scorer.ts # Scores university grade (A=100, B=80, C=60, D=40)
│   │   ├── academic-scorer.ts   # Evaluates student academics (weight 0.70)
│   │   ├── coapplicant-scorer.ts # Evaluates co-applicant metrics (weight 0.20)
│   │   ├── overall-scorer.ts    # Aggregates weighted scores & checks threshold (>=60 each)
│   │   └── pincode-lookup.ts    # Resolves Indian pincode tier & serviceability
│   ├── knockout/
│   │   └── knockout-engine.ts  # Runs per-lender policy rules & filters out matches
│   ├── tools/
│   │   └── evaluate-profile.ts  # Main tool orchestration logic
│   ├── utils/
│   │   ├── fuzzy-search.ts     # In-memory trigram fuzzy matcher
│   │   └── data-loader.ts      # Lazy data-loader for Excel-extracted datasets
│   └── data/                   # Master datasets derived from Excel inputs
└── scratch/
    ├── test-bre.js             # Integration test harness
    └── copy-data.mjs           # Asset copy utility run during builds
```

---

## 🏛️ Lender Policy Matrix

The engine uses actual data parsed from master spreadsheets. A brief overview of the 12 active lender profiles:

| Lender | Type | Secured ROI | Unsecured ROI | CIBIL Min | Min Salary | Min ITR | Max Co-App Age | Unsecured Limits |
|---|---|---|---|---|---|---|---|---|
| **PNB Bank** | PSU | 8.5% - 10.0% | *N/A* | 680 | ₹15,000 | ₹3,00,000 | 60 yrs | *N/A* |
| **SBI (Delhi Code)**| PSU | 8.5% - 10.0% | 9.0% - 10.5% | 680 | ₹15,000 | ₹3,00,000 | 60 yrs | ₹10L - ₹50L |
| **Bank Of India** | PSU | 8.5% - 10.0% | *N/A* | 700 | ₹15,000 | ₹3,00,000 | 60 yrs | *N/A* |
| **Canara Bank** | PSU | 8.5% - 10.0% | *N/A* | 680 | ₹15,000 | ₹3,00,000 | 60 yrs | *N/A* |
| **BOB** | PSU | 8.5% - 10.0% | *N/A* | 680 | ₹15,000 | ₹3,00,000 | 60 yrs | *N/A* |
| **Axis Bank** | Private | 9.5% - 10.5% | 11.0% - 13.0% | 700 | ₹40,000 | ₹5,00,000 | 60 yrs | ₹7.5L - ₹1Cr |
| **ICICI Bank** | Private | 9.5% - 10.5% | 11.0% - 13.0% | 700 | ₹40,000 | ₹5,00,000 | 60 yrs | ₹7.5L - ₹1Cr |
| **IDFC Bank** | Private | 9.5% - 10.5% | 11.0% - 13.0% | 700 | ₹40,000 | ₹5,00,000 | 60 yrs | ₹7.5L - ₹1Cr |
| **Credila** | NBFC | 9.5% - 10.5% | 11.25% - 12.5%| 680 | ₹25,000 | ₹4,00,000 | 60 yrs | ₹7.5L - ₹1Cr |
| **Avanse** | NBFC | 9.5% - 10.5% | 11.5% - 12.5% | 680 | ₹25,000 | ₹4,00,000 | 60 yrs | ₹7.5L - ₹1.25Cr |
| **Auxilo** | NBFC | 10.5% - 11.0%| 10.5% - 13.0% | 680 | ₹25,000 | ₹4,00,000 | 60 yrs | ₹7.5L - ₹1Cr |
| **Gyandhan** | NBFC | 9.5% - 10.75%| 10.5% - 14.0% | 680 | ₹15,000 | ₹4,00,000 | 60 yrs | ₹7.5L - ₹3Cr |

---

## ⚖️ License

MIT License. Designed with excellence for EduLoans.
