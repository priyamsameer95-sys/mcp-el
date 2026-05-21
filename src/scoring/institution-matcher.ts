import Fuse from 'fuse.js';
import { getLenderInstitutions } from '../utils/data-loader.js';
import { lookupUniversity } from './university-scorer.js';
import type { InstitutionStatus } from '../types.js';

// How each lender determines institution eligibility:
// "list"           = we have their explicit approved list
// "qs_rank"        = lender uses QS ranking, no fixed list
// "shared_missing" = lender has a list but we don't have the data, use QS as proxy
// "no_list"        = no list, country/accreditation based (PSU secured-only banks)
const LENDER_LIST_MODE: Record<string, string> = {
  "PNB Bank":         "list",           // 37 institutions
  "SBI (Delhi Code)": "shared_missing", // Has list, not in our data
  "Bank Of India":    "no_list",
  "Canara Bank":      "no_list",
  "BOB":              "no_list",
  "Axis Bank":        "list",           // 774 institutions
  "ICICI Bank":       "list",           // 2,987 institutions
  "IDFC Bank":        "shared_missing",
  "Credila":          "qs_rank",        // "No List - QS ranking is followed"
  "Avanse":           "list",           // 844 institutions (also QS)
  "Auxilo":           "shared_missing",
  "Gyandhan":         "shared_missing",
};

let lenderInstFuse: Record<string, Fuse<any>> | null = null;

function initializeFuse() {
  if (lenderInstFuse) return;
  lenderInstFuse = {};
  const data = getLenderInstitutions();
  for (const [lenderName, lenderData] of Object.entries(data)) {
    if (lenderData && Array.isArray((lenderData as any).institutions)) {
      lenderInstFuse[lenderName] = new Fuse((lenderData as any).institutions, {
        keys: ["name"],
        threshold: 0.25,
        includeScore: true,
      });
    } else if (Array.isArray(lenderData)) {
       lenderInstFuse[lenderName] = new Fuse(lenderData, {
        keys: ["name"],
        threshold: 0.25,
        includeScore: true,
      });
    }
  }
}

/**
 * Check if a university is on a lender's approved institution list.
 */
export function checkInstitutionForLender(universityName: string, lenderName: string): InstitutionStatus {
  initializeFuse();
  const mode = LENDER_LIST_MODE[lenderName] || "no_list";

  if (mode === "no_list") {
    return {
      is_primary: null,
      mode: "no_list",
      product_tier: null,
      note: "Lender does not maintain an institution list",
    };
  }

  if (mode === "qs_rank") {
    const uni = lookupUniversity(universityName);
    const grade = uni ? uni.grade : "D";
    const isPrimary = grade === "A" || grade === "B";
    return {
      is_primary: isPrimary,
      mode: "qs_rank",
      product_tier: null,
      note: isPrimary
        ? `Grade ${grade} — primary institution (QS-based)`
        : `Grade ${grade} — not primary, collateral likely required`,
    };
  }

  if (mode === "shared_missing") {
    // We know the lender has a list but don't have it. Use QS grade as proxy.
    const uni = lookupUniversity(universityName);
    const grade = uni ? uni.grade : "D";
    const isPrimary = grade === "A" || grade === "B";
    return {
      is_primary: isPrimary,
      mode: "qs_proxy",
      product_tier: null,
      note: isPrimary
        ? `Grade ${grade} — likely primary (institution list not available, using QS proxy)`
        : `Grade ${grade} — likely non-primary (institution list not available)`,
    };
  }

  // mode === "list" — check against actual institution list
  if (!lenderInstFuse) return { is_primary: false, mode: 'error', product_tier: null, note: 'Fuse not initialized' };

  let fuse = lenderInstFuse[lenderName];
  if (!fuse) {
    // Lender name in LENDER_LIST_MODE doesn't match exactly. Try common variations
    const altNames: Record<string, string> = {
      "PNB Bank": "PNB Bank",
      "Axis Bank": "Axis Bank",
      "ICICI Bank": "ICICI Bank",
      "Avanse": "Avanse",
    };
    const mapped = altNames[lenderName];
    if (mapped) {
      fuse = lenderInstFuse[mapped];
    }
    
    if (!fuse) {
      return {
        is_primary: null,
        mode: "list_unavailable",
        product_tier: null,
        note: `Institution list for ${lenderName} not loaded`,
      };
    }
  }

  const results = fuse.search(universityName);

  if (results.length > 0 && results[0].score !== undefined && results[0].score < 0.25) {
    const match = results[0].item;
    return {
      is_primary: true,
      mode: "list",
      product_tier: match.product_tier || null,
      note: `Found on ${lenderName} approved list${match.product_tier ? ` (${match.product_tier})` : ""}`,
    };
  }

  return {
    is_primary: false,
    mode: "list",
    product_tier: null,
    note: `Not found on ${lenderName} approved institution list`,
  };
}
