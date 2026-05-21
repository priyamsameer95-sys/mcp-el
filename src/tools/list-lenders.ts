import { getLenders } from '../utils/data-loader.js';

export async function handleListLenders(args: { loan_type?: string }) {
  let lenders = getLenders();

  if (args.loan_type === 'Secured') {
    lenders = lenders.filter(l => l.loan_amount.secured !== null);
  } else if (args.loan_type === 'Unsecured') {
    lenders = lenders.filter(l => l.loan_amount.unsecured !== null);
  }

  const output = lenders.map(l => ({
    name: l.name,
    type: l.type,
    roi: l.roi,
    pf: l.pf,
    tenure_years: l.tenure_years,
    moratorium: l.moratorium,
    loan_amount: l.loan_amount,
    cibil_min: l.cibil_min,
    min_salary: l.min_salary,
    min_itr: l.min_itr,
    student_age: l.student_age,
    co_applicant_max_age: l.co_applicant_max_age,
    co_applicant_allowed: l.co_applicant_allowed,
    ltv: l.ltv,
    countries_blocked: l.countries_blocked,
    regions_blocked: l.regions_blocked,
    institution_list_type: l.institution_list_type,
  }));

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify(output, null, 2),
    }],
  };
}
