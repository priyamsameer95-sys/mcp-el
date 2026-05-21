import { getLenders } from '../utils/data-loader.js';
import { lookupPincode } from '../scoring/pincode-lookup.js';
import { checkInstitutionForLender } from '../scoring/institution-matcher.js';
import type { EvaluateProfileInput, LenderConfig, IneligibleLender, EligibleLender, LoanType, LoanOption } from '../types.js';

function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function checkHardKnockouts(
  input: EvaluateProfileInput,
  lender: LenderConfig
): string[] {
  const reasons: string[] = [];

  // 1. Student age
  const studentAge = calculateAge(input.date_of_birth);
  if (studentAge < lender.student_age.min || studentAge > lender.student_age.max) {
    reasons.push(`Student age ${studentAge} is outside the allowed range ${lender.student_age.min}-${lender.student_age.max}`);
  }

  // 2. 10th marks
  if (input.marks_10th < lender.marks_min['10th']) {
    reasons.push(`Class 10th marks ${input.marks_10th}% are below the minimum ${lender.marks_min['10th']}% required by ${lender.name}`);
  }

  // 3. 12th marks
  if (input.marks_12th < lender.marks_min['12th']) {
    reasons.push(`Class 12th marks ${input.marks_12th}% are below the minimum ${lender.marks_min['12th']}% required by ${lender.name}`);
  }

  // 4. Graduation marks
  if (input.marks_graduation < lender.marks_min.graduation) {
    reasons.push(`Graduation marks ${input.marks_graduation}% are below the minimum ${lender.marks_min.graduation}% required by ${lender.name}`);
  }

  // 5. Co-applicant age
  if (input.coapplicant_age > lender.co_applicant_max_age) {
    reasons.push(`Co-applicant age ${input.coapplicant_age} exceeds the maximum ${lender.co_applicant_max_age} years allowed by ${lender.name}`);
  }

  // 6. Student CIBIL
  if (input.student_cibil > 0 && input.student_cibil < lender.cibil_min) {
    reasons.push(`Student CIBIL score ${input.student_cibil} is below the minimum ${lender.cibil_min} required by ${lender.name}`);
  }

  // 7. Co-applicant CIBIL
  if (input.coapplicant_cibil < lender.cibil_min) {
    reasons.push(`Co-applicant CIBIL score ${input.coapplicant_cibil} is below the minimum ${lender.cibil_min} required by ${lender.name}`);
  }

  // 8. Co-applicant relation check
  const normalizedRelation = input.coapplicant_relation;
  const allowedRelations = lender.co_applicant_allowed.map(r => r.toLowerCase().trim());
  const relationMatch = allowedRelations.some(r =>
    r.includes(normalizedRelation.toLowerCase()) || normalizedRelation.toLowerCase().includes(r)
  );
  if (!relationMatch && normalizedRelation !== 'Others') {
    const isAllowed = allowedRelations.some(r => {
      if (normalizedRelation === 'Father') return r.includes('father');
      if (normalizedRelation === 'Mother') return r.includes('mother');
      if (normalizedRelation === 'Brother') return r.includes('brother');
      if (normalizedRelation === 'Sister') return r.includes('sister');
      if (normalizedRelation === 'Spouse') return r.includes('spouse');
      return false;
    });
    if (!isAllowed) {
      reasons.push(`Co-applicant relation "${normalizedRelation}" is not accepted by ${lender.name}. Allowed: ${lender.co_applicant_allowed.join(', ')}`);
    }
  }

  // 9. Min income check
  if (input.coapplicant_employment_type === 'Salaried') {
    const monthly = input.coapplicant_monthly_income ?? 0;
    if (monthly < lender.min_salary) {
      reasons.push(`Co-applicant monthly salary ₹${monthly.toLocaleString('en-IN')} is below the minimum ₹${lender.min_salary.toLocaleString('en-IN')} required by ${lender.name}`);
    }
  } else {
    const annualITR = input.coapplicant_annual_itr ?? 0;
    if (annualITR < lender.min_itr) {
      reasons.push(`Co-applicant annual ITR ₹${annualITR.toLocaleString('en-IN')} is below the minimum ₹${lender.min_itr.toLocaleString('en-IN')} required by ${lender.name}`);
    }
  }

  // 10. Country check
  const normalizedCountry = input.country.toLowerCase().trim();
  const blockedCountries = lender.countries_blocked.map(c => c.toLowerCase().trim());
  if (blockedCountries.some(c => normalizedCountry.includes(c) || c.includes(normalizedCountry))) {
    reasons.push(`Country "${input.country}" is not covered by ${lender.name}`);
  }

  // 11. Region check (student pincode)
  const studentPin = lookupPincode(input.student_pincode);
  if (studentPin.is_blocked && studentPin.blocked_region) {
    reasons.push(`Student location in ${studentPin.blocked_region} is not serviceable by ${lender.name}`);
  }

  // 12. Region check (co-applicant pincode)
  const coapPin = lookupPincode(input.coapplicant_pincode);
  if (coapPin.is_blocked && coapPin.blocked_region) {
    reasons.push(`Co-applicant location in ${coapPin.blocked_region} is not serviceable by ${lender.name}`);
  }

  // 12b. Kerala check (Avanse-specific)
  if (lender.regions_blocked.some(r => r.toLowerCase().includes('kerala'))) {
    if (studentPin.state.toLowerCase().includes('kerala') || coapPin.state.toLowerCase().includes('kerala')) {
      reasons.push(`Kerala region is not serviceable by ${lender.name}`);
    }
  }

  return reasons;
}

export function evaluateLenders(
  input: EvaluateProfileInput
): { eligible: EligibleLender[]; ineligible: IneligibleLender[] } {
  const lenders = getLenders();
  const eligible: EligibleLender[] = [];
  const ineligible: IneligibleLender[] = [];

  const loanAmount = input.loan_amount_requested;
  const hasCollateral = input.collateral_type && input.collateral_type !== 'None';

  for (const lender of lenders) {
    const hardKnockouts = checkHardKnockouts(input, lender);
    if (hardKnockouts.length > 0) {
      ineligible.push({
        lender_name: lender.name,
        lender_type: lender.type,
        knockout_reasons: hardKnockouts,
      });
      continue;
    }

    // ---- INSTITUTION CHECK ----
    const instCheck = checkInstitutionForLender(input.university_name, lender.name);
    const isPrimary = instCheck.is_primary === true;

    // ---- DETERMINE AVAILABLE LOAN OPTIONS ----
    const options: LoanOption[] = [];

    // UNSECURED option
    if (lender.loan_amount.unsecured && isPrimary) {
      const minUnsec = lender.loan_amount.unsecured.min;
      const maxUnsec = lender.loan_amount.unsecured.max;
      
      let unsecFit = true;
      let unsecNote: string | null = null;
      if (minUnsec && loanAmount < minUnsec) {
        unsecFit = false;
        unsecNote = `Loan amount ₹${loanAmount.toLocaleString('en-IN')} below unsecured minimum ₹${minUnsec.toLocaleString('en-IN')}`;
      }
      if (maxUnsec && loanAmount > maxUnsec) {
        unsecFit = false;
        unsecNote = `Loan amount ₹${loanAmount.toLocaleString('en-IN')} exceeds unsecured maximum ₹${maxUnsec.toLocaleString('en-IN')}`;
      }

      const roiUnsecStr = lender.roi.unsecured ? `${lender.roi.unsecured.min}% - ${lender.roi.unsecured.max}%` : null;

      options.push({
        loan_type: "Unsecured",
        available: unsecFit,
        indicative_roi: roiUnsecStr,
        loan_range: { min: minUnsec, max: maxUnsec },
        collateral_required: false,
        note: unsecFit ? "Primary institution — no collateral needed" : unsecNote,
      });
    }

    // SECURED option
    if (lender.loan_amount.secured) {
      const minSec = lender.loan_amount.secured.min;
      const maxSec = lender.loan_amount.secured.max;

      let secFit = true;
      let secNote: string | null = null;
      if (minSec && loanAmount < minSec) {
        secFit = false;
        secNote = `Loan amount ₹${loanAmount.toLocaleString('en-IN')} below secured minimum ₹${minSec.toLocaleString('en-IN')}`;
      }
      if (maxSec && loanAmount > maxSec) {
        secFit = false;
        secNote = `Loan amount ₹${loanAmount.toLocaleString('en-IN')} exceeds secured maximum ₹${maxSec.toLocaleString('en-IN')}`;
      }

      // LTV check if collateral provided
      let ltvInfo = null;
      if (hasCollateral && input.collateral_value && input.collateral_type) {
        const ct = input.collateral_type.toLowerCase();
        let ratio = null;
        if (ct.includes("fd")) ratio = lender.ltv.fd;
        else if (ct.includes("resid")) ratio = lender.ltv.residential;
        else if (ct.includes("commerc")) ratio = lender.ltv.commercial;
        
        if (ratio) {
          ltvInfo = {
            collateral_type: input.collateral_type,
            collateral_value: input.collateral_value,
            ltv_ratio: ratio,
            max_loan_on_collateral: Math.round(input.collateral_value * ratio),
          };
          if (loanAmount > ltvInfo.max_loan_on_collateral) {
            secFit = false;
            secNote = `Loan amount exceeds ${Math.round(ratio * 100)}% LTV of collateral value (max: ₹${ltvInfo.max_loan_on_collateral.toLocaleString('en-IN')})`;
          }
        }
      } else if (!hasCollateral) {
        secFit = false;
        secNote = "Collateral is required for this option";
      }

      const roiSecStr = lender.roi.secured ? `${lender.roi.secured.min}% - ${lender.roi.secured.max}%` : null;

      options.push({
        loan_type: "Secured",
        available: secFit,
        indicative_roi: roiSecStr,
        loan_range: { min: minSec, max: maxSec },
        collateral_required: true,
        ltv: ltvInfo,
        note: secFit
          ? (isPrimary 
              ? "Secured option available at lower interest rate" 
              : "Collateral required — institution not on lender's primary list")
          : secNote,
      });
    }

    // ---- DETERMINE ELIGIBILITY ----
    const viableOptions = options.filter((o) => o.available);

    if (viableOptions.length === 0) {
      // All options failed
      const reasons = options.map((o) => `${o.loan_type}: ${o.note}`);
      if (!isPrimary && !lender.loan_amount.unsecured) {
        reasons.unshift(`Institution not on primary list and ${lender.name} requires collateral`);
      } else if (!isPrimary && lender.loan_amount.unsecured) {
        reasons.unshift(`Institution not on ${lender.name} primary list — unsecured not available`);
      }
      ineligible.push({
        lender_name: lender.name,
        lender_type: lender.type,
        knockout_reasons: reasons.length > 0 ? reasons : ["No viable loan option for requested amount"],
      });
      continue;
    }

    // Pick the best option (prefer unsecured if available)
    const bestOption = viableOptions.find((o) => o.loan_type === "Unsecured") || viableOptions[0];

    eligible.push({
      lender_name: lender.name,
      lender_type: lender.type,
      institution_status: instCheck,
      recommended: {
        loan_type: bestOption.loan_type,
        indicative_roi: bestOption.indicative_roi,
        loan_range: bestOption.loan_range,
        collateral_required: bestOption.collateral_required,
      },
      all_options: options,
      processing_fee: lender.pf,
      moratorium: lender.moratorium,
    });
  }

  return { eligible, ineligible };
}
