import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { LenderConfig, UniversityRecord, ScoringRules } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '..', 'data');

function loadJSON<T>(filename: string): T {
  const raw = readFileSync(join(DATA_DIR, filename), 'utf-8');
  return JSON.parse(raw) as T;
}

// Lazy-loaded singletons
let _lenders: LenderConfig[] | null = null;
let _universities: UniversityRecord[] | null = null;
let _lenderInstitutions: Record<string, any[]> | null = null;
let _scoringRules: ScoringRules | null = null;
let _pincodes: any | null = null;
let _countries: any | null = null;
let _courses: any | null = null;

export function getLenders(): LenderConfig[] {
  if (!_lenders) _lenders = loadJSON<LenderConfig[]>('lenders.json');
  return _lenders;
}

export function getUniversities(): UniversityRecord[] {
  if (!_universities) _universities = loadJSON<UniversityRecord[]>('universities_extended.json');
  return _universities;
}

export function getLenderInstitutions(): Record<string, any[]> {
  if (!_lenderInstitutions) _lenderInstitutions = loadJSON<Record<string, any[]>>('lender-institutions.json');
  return _lenderInstitutions;
}

export function getScoringRules(): ScoringRules {
  if (!_scoringRules) _scoringRules = loadJSON<ScoringRules>('scoring-rules.json');
  return _scoringRules;
}

export function getPincodes(): any {
  if (!_pincodes) _pincodes = loadJSON<any>('pincodes.json');
  return _pincodes;
}

export function getCountries(): any {
  if (!_countries) _countries = loadJSON<any>('countries.json');
  return _countries;
}

export function getCourses(): any {
  if (!_courses) _courses = loadJSON<any>('courses.json');
  return _courses;
}
