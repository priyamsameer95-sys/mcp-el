import { getLenders, getLenderInstitutions, getPincodes } from '../utils/data-loader.js';
import { lookupPincode } from '../scoring/pincode-lookup.js';
import type { EvaluateProfileInput, LenderConfig, IneligibleLender, EligibleLender, LoanType } from '../types.js';

function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function normalizeForMatch(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

export function checkKnockouts(
  input: EvaluateProfileInput,
  lender: LenderConfig
): string | null {
  // 1. Student age
  const studentAge = calculateAge(input.date_of_birth);
  if (studentAge < lender.student_age.min || studentAge > lender.student_age.max) {
    return `Student age ${studentAge} is outside the allowed range ${lender.student_age.min}-${lender.student_age.max}`;
  }

  // 2. 10th marks
  if (input.marks_10th < lender.marks_min['10th']) {
    return `Class 10th marks ${input.marks_10th}% are below the minimum ${lender.marks_min['10th']}% required by ${lender.name}`;
  }

  // 3. 12th marks
  if (input.marks_12th < lender.marks_min['12th']) {
    return `Class 12th marks ${input.marks_12th}% are below the minimum ${lender.marks_min['12th']}% required by ${lender.name}`;
  }

  // 4. Graduation marks
  if (input.marks_graduation < lender.marks_min.graduation) {
    return `Graduation marks ${input.marks_graduation}% are below the minimum ${lender.marks_min.graduation}% required by ${lender.name}`;
  }

  // 5. Co-applicant age
  if (input.coapplicant_age > lender.co_applicant_max_age) {
    return `Co-applicant age ${input.coapplicant_age} exceeds the maximum ${lender.co_applicant_max_age} years allowed by ${lender.name}`;
  }

  // 6. Student CIBIL
  if (input.student_cibil > 0 && input.student_cibil < lender.cibil_min) {
    return `Student CIBIL score ${input.student_cibil} is below the minimum ${lender.cibil_min} required by ${lender.name}`;
  }

  // 7. Co-applicant CIBIL
  if (input.coapplicant_cibil < lender.cibil_min) {
    return `Co-applicant CIBIL score ${input.coapplicant_cibil} is below the minimum ${lender.cibil_min} required by ${lender.name}`;
  }

  // 8. Co-applicant relation check
  const normalizedRelation = input.coapplicant_relation;
  const allowedRelations = lender.co_applicant_allowed.map(r => r.toLowerCase().trim());
  const relationMatch = allowedRelations.some(r =>
    r.includes(normalizedRelation.toLowerCase()) || normalizedRelation.toLowerCase().includes(r)
  );
  if (!relationMatch && normalizedRelation !== 'Others') {
    // Allow 'Others' through with a note, but check specific disallowed
    // Actually check if the relation maps to any allowed entry
    const isAllowed = allowedRelations.some(r => {
      if (normalizedRelation === 'Father') return r.includes('father');
      if (normalizedRelation === 'Mother') return r.includes('mother');
      if (normalizedRelation === 'Brother') return r.includes('brother');
      if (normalizedRelation === 'Sister') return r.includes('sister');
      if (normalizedRelation === 'Spouse') return r.includes('spouse');
      return false;
    });
    if (!isAllowed) {
      return `Co-applicant relation "${normalizedRelation}" is not accepted by ${lender.name}. Allowed: ${lender.co_applicant_allowed.join(', ')}`;
    }
  }

  // 9. Min income check
  if (input.coapplicant_employment_type === 'Salaried') {
    const monthly = input.coapplicant_monthly_income ?? 0;
    if (monthly < lender.min_salary) {
      return `Co-applicant monthly salary ₹${monthly.toLocaleString('en-IN')} is below the minimum ₹${lender.min_salary.toLocaleString('en-IN')} required by ${lender.name}`;
    }
  } else {
    // Self-employed or agricultural
    const annualITR = input.coapplicant_annual_itr ?? 0;
    if (annualITR < lender.min_itr) {
      return `Co-applicant annual ITR ₹${annualITR.toLocaleString('en-IN')} is below the minimum ₹${lender.min_itr.toLocaleString('en-IN')} required by ${lender.name}`;
    }
  }

  // 10. Country check
  const normalizedCountry = input.country.toLowerCase().trim();
  const blockedCountries = lender.countries_blocked.map(c => c.toLowerCase().trim());
  if (blockedCountries.some(c => normalizedCountry.includes(c) || c.includes(normalizedCountry))) {
    return `Country "${input.country}" is not covered by ${lender.name}`;
  }

  // 11. Region check (student pincode)
  const studentPin = lookupPincode(input.student_pincode);
  if (studentPin.is_blocked && studentPin.blocked_region) {
    return `Student location in ${studentPin.blocked_region} is not serviceable by ${lender.name}`;
  }

  // 12. Region check (co-applicant pincode)
  const coapPin = lookupPincode(input.coapplicant_pincode);
  if (coapPin.is_blocked && coapPin.blocked_region) {
    return `Co-applicant location in ${coapPin.blocked_region} is not serviceable by ${lender.name}`;
  }

  // 12b. Kerala check (Avanse-specific)
  if (lender.regions_blocked.some(r => r.toLowerCase().includes('kerala'))) {
    if (studentPin.state.toLowerCase().includes('kerala') || coapPin.state.toLowerCase().includes('kerala')) {
      return `Kerala region is not serviceable by ${lender.name}`;
    }
  }

  // 13. Determine loan type and check amount
  const hasCollateral = input.collateral_type && input.collateral_type !== 'None';
  let loanType: LoanType;

  if (hasCollateral) {
    // Secured route
    if (!lender.loan_amount.secured) {
      return `${lender.name} does not offer secured loans`;
    }
    loanType = 'Secured';
    if (input.loan_amount_requested < lender.loan_amount.secured.min) {
      return `Loan amount ₹${input.loan_amount_requested.toLocaleString('en-IN')} is below the minimum secured loan amount ₹${lender.loan_amount.secured.min.toLocaleString('en-IN')} for ${lender.name}`;
    }
    if (input.loan_amount_requested > lender.loan_amount.secured.max) {
      return `Loan amount ₹${input.loan_amount_requested.toLocaleString('en-IN')} exceeds the maximum secured loan amount ₹${lender.loan_amount.secured.max.toLocaleString('en-IN')} for ${lender.name}`;
    }

    // 14. LTV check
    if (input.collateral_value && input.collateral_type) {
      const ltvKey = input.collateral_type.toLowerCase() as 'fd' | 'residential' | 'commercial';
      const ltvRatio = lender.ltv[ltvKey] ?? 0.6;
      const maxLoanFromCollateral = input.collateral_value * ltvRatio;
      if (input.loan_amount_requested > maxLoanFromCollateral) {
        return `Loan amount ₹${input.loan_amount_requested.toLocaleString('en-IN')} exceeds ${Math.round(ltvRatio * 100)}% LTV of collateral value ₹${input.collateral_value.toLocaleString('en-IN')} (max: ₹${Math.round(maxLoanFromCollateral).toLocaleString('en-IN')}) for ${lender.name}`;
      }
    }
  } else {
    // Unsecured route
    if (!lender.loan_amount.unsecured) {
      return `${lender.name} does not offer unsecured loans`;
    }
    loanType = 'Unsecured';
    if (input.loan_amount_requested < lender.loan_amount.unsecured.min) {
      return `Loan amount ₹${input.loan_amount_requested.toLocaleString('en-IN')} is below the minimum unsecured loan amount ₹${lender.loan_amount.unsecured.min.toLocaleString('en-IN')} for ${lender.name}`;
    }
    if (input.loan_amount_requested > lender.loan_amount.unsecured.max) {
      return `Loan amount ₹${input.loan_amount_requested.toLocaleString('en-IN')} exceeds the maximum unsecured loan amount ₹${lender.loan_amount.unsecured.max.toLocaleString('en-IN')} for ${lender.name}`;
    }
  }

  // 15. Institution list check (for lenders with specific lists)
  if (lender.institution_list_type === 'shared' || lender.institution_list_type === 'Shared') {
    const lenderInsts = getLenderInstitutions();
    // Map lender names to keys in lender-institutions.json
    const lenderKey = (() => {
      const name = lender.name.toLowerCase();
      if (name.includes('avanse')) return 'Avanse';
      if (name.includes('axis')) return 'Axis Bank';
      if (name.includes('pnb')) return 'PNB';
      if (name.includes('icici')) return 'ICICI Bank';
      if (name.includes('sib')) return 'SIB';
      return null;
    })();

    if (lenderKey && lenderInsts[lenderKey]) {
      const institutions = lenderInsts[lenderKey];
      const normalizedUniName = normalizeForMatch(input.university_name);
      const found = institutions.some(inst =>
        normalizeForMatch(inst.name).includes(normalizedUniName) ||
        normalizedUniName.includes(normalizeForMatch(inst.name))
      );
      if (!found) {
        // Don't hard-reject, but note it. For now, only hard-reject for lenders with strict lists.
        // PNB has only 37 institutions - strict list. Avanse and ICICI are broader.
        if (lenderKey === 'PNB') {
          return `University "${input.university_name}" is not on ${lender.name}'s approved institution list (${institutions.length} institutions)`;
        }
        // For Avanse, Axis - softer check, only reject if lender has QS ranking follow
      }
    }
  }

  return null; // No knockout - eligible
}

export function evaluateLenders(
  input: EvaluateProfileInput
): { eligible: EligibleLender[]; ineligible: IneligibleLender[] } {
  const lenders = getLenders();
  const eligible: EligibleLender[] = [];
  const ineligible: IneligibleLender[] = [];

  for (const lender of lenders) {
    const knockoutReason = checkKnockouts(input, lender);
    if (knockoutReason) {
      ineligible.push({
        lender_name: lender.name,
        lender_type: lender.type,
        knockout_reason: knockoutReason,
      });
    } else {
      const hasCollateral = input.collateral_type && input.collateral_type !== 'None';
      const loanType: LoanType = hasCollateral ? 'Secured' : 'Unsecured';
      const roiRange = hasCollateral ? lender.roi.secured : lender.roi.unsecured;
      const amountRange = hasCollateral ? lender.loan_amount.secured : lender.loan_amount.unsecured;

      const ltvKey = (input.collateral_type?.toLowerCase() ?? 'residential') as 'fd' | 'residential' | 'commercial';

      eligible.push({
        lender_name: lender.name,
        lender_type: lender.type,
        eligibility: 'Eligible',
        knockout_reason: null,
        loan_type: loanType,
        eligible_loan_range: amountRange ?? { min: 0, max: 0 },
        indicative_rate_range: roiRange ?? { min: 0, max: 0 },
        processing_fee: lender.pf,
        moratorium: lender.moratorium,
        ltv_ratio: hasCollateral ? lender.ltv[ltvKey] ?? null : null,
      });
    }
  }

  return { eligible, ineligible };
}
