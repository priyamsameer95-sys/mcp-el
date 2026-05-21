import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';
import * as http from 'http';
import { URL } from 'url';

// Import tool handlers
import { handleEvaluateProfile } from './tools/evaluate-profile.js';
import { handleCheckUniversity } from './tools/check-university.js';
import { handleCheckPincode } from './tools/check-pincode.js';
import { handleListLenders } from './tools/list-lenders.js';
import { handleScoreBreakdown } from './tools/score-breakdown.js';
import { handleGetScoringRules } from './tools/get-scoring-rules.js';
import { handleSearchUniversities } from './tools/search-universities.js';
import { handleListCountries } from './tools/list-countries.js';
import { handleListCourses } from './tools/list-courses.js';

const server = new McpServer({
  name: 'eduloans-bre',
  version: '1.0.0',
});

// Tool 1: evaluate_profile
server.tool(
  'evaluate_profile',
  'Evaluate a student\'s education loan profile. Returns overall scoring, eligible lenders with loan terms, and ineligible lenders with specific knockout reasons. This is the main BRE (Business Rule Engine) call.',
  {
    student_name: z.string().describe('Full name of the student'),
    date_of_birth: z.string().describe('Date of birth in YYYY-MM-DD format'),
    student_pincode: z.string().describe('6-digit Indian pincode of student'),
    marks_10th: z.number().min(0).max(100).describe('Class 10th percentage (0-100)'),
    marks_12th: z.number().min(0).max(100).describe('Class 12th percentage (0-100)'),
    marks_graduation: z.number().min(0).max(100).describe('Graduation percentage (0-100)'),
    highest_qualification: z.enum(['PhD', 'CA', 'CMA', 'CS', 'CFA', 'Dr', 'Masters', 'MBA', 'Bachelors', 'Diploma']).describe('Highest qualification achieved'),
    exam_academic: z.enum(['GRE', 'GMAT']).nullable().describe('Academic exam taken (GRE or GMAT), or null if none'),
    exam_academic_score: z.number().nullable().describe('Academic exam score, or null'),
    exam_language: z.enum(['TOEFL', 'IELTS']).nullable().describe('Language exam taken, or null'),
    exam_language_score: z.number().nullable().describe('Language exam score, or null'),
    university_name: z.string().describe('Name of the target university'),
    country: z.string().describe('Country of the university'),
    course_level: z.enum(['UG', 'PG']).describe('Course level: UG (undergraduate) or PG (postgraduate)'),
    coapplicant_relation: z.enum(['Father', 'Mother', 'Brother', 'Sister', 'Spouse', 'Others']).describe('Relation of co-applicant to student'),
    coapplicant_employment_type: z.enum(['Salaried', 'Self Employed', 'Agricultural Income']).describe('Employment type of co-applicant'),
    coapplicant_monthly_income: z.number().nullable().describe('Co-applicant monthly income in INR (for salaried)'),
    coapplicant_annual_itr: z.number().nullable().describe('Co-applicant annual ITR in INR (for self-employed)'),
    coapplicant_age: z.number().describe('Age of co-applicant in years'),
    coapplicant_pincode: z.string().describe('6-digit Indian pincode of co-applicant'),
    coapplicant_cibil: z.number().describe('CIBIL score of co-applicant (300-900)'),
    student_cibil: z.number().describe('CIBIL score of student (300-900, or 0 if no history)'),
    loan_amount_requested: z.number().describe('Loan amount requested in INR'),
    collateral_type: z.enum(['None', 'FD', 'Residential', 'Commercial']).nullable().describe('Type of collateral, or null/None for unsecured'),
    collateral_value: z.number().nullable().describe('Value of collateral in INR, or null'),
  },
  handleEvaluateProfile
);

// Tool 2: check_university
server.tool(
  'check_university',
  'Look up a university by name or QS rank. Returns the university grade, points, QS rank, country, and which lenders cover it.',
  {
    university_name: z.string().optional().describe('University name to search (fuzzy matching supported)'),
    qs_rank: z.number().optional().describe('QS global rank to look up'),
  },
  handleCheckUniversity
);

// Tool 3: check_pincode
server.tool(
  'check_pincode',
  'Look up an Indian pincode to get city, state, tier classification, and points. Also checks if the pincode is in a blocked region (J&K, North East India, Kerala).',
  {
    pincode: z.string().describe('6-digit Indian pincode'),
  },
  handleCheckPincode
);

// Tool 4: list_lenders
server.tool(
  'list_lenders',
  'Get the full lender policy grid for all 12 education loan lenders. Shows ROI ranges, loan amounts, CIBIL requirements, income thresholds, country coverage, and more.',
  {
    loan_type: z.enum(['Secured', 'Unsecured']).optional().describe('Filter by loan type'),
  },
  handleListLenders
);

// Tool 5: score_breakdown
server.tool(
  'score_breakdown',
  'Get a detailed step-by-step breakdown of how a profile score was calculated. Shows each attribute, the rule applied, raw score, weight, and weighted score for all three scoring buckets (university, academic, co-applicant). Designed for debugging and transparency.',
  {
    student_name: z.string(),
    date_of_birth: z.string(),
    student_pincode: z.string(),
    marks_10th: z.number().min(0).max(100),
    marks_12th: z.number().min(0).max(100),
    marks_graduation: z.number().min(0).max(100),
    highest_qualification: z.enum(['PhD', 'CA', 'CMA', 'CS', 'CFA', 'Dr', 'Masters', 'MBA', 'Bachelors', 'Diploma']),
    exam_academic: z.enum(['GRE', 'GMAT']).nullable(),
    exam_academic_score: z.number().nullable(),
    exam_language: z.enum(['TOEFL', 'IELTS']).nullable(),
    exam_language_score: z.number().nullable(),
    university_name: z.string(),
    country: z.string(),
    course_level: z.enum(['UG', 'PG']),
    coapplicant_relation: z.enum(['Father', 'Mother', 'Brother', 'Sister', 'Spouse', 'Others']),
    coapplicant_employment_type: z.enum(['Salaried', 'Self Employed', 'Agricultural Income']),
    coapplicant_monthly_income: z.number().nullable(),
    coapplicant_annual_itr: z.number().nullable(),
    coapplicant_age: z.number(),
    coapplicant_pincode: z.string(),
    coapplicant_cibil: z.number(),
    student_cibil: z.number(),
    loan_amount_requested: z.number(),
    collateral_type: z.enum(['None', 'FD', 'Residential', 'Commercial']).nullable(),
    collateral_value: z.number().nullable(),
  },
  handleScoreBreakdown
);

// Tool 6: get_scoring_rules
server.tool(
  'get_scoring_rules',
  'Return the current BRE scoring rule configuration. Shows all rule tables including marks→points, qualification→points, exam→points, income bands, weights, and thresholds.',
  {
    category: z.enum(['university', 'academic', 'coapplicant', 'all']).optional().default('all').describe('Which category of rules to return'),
  },
  handleGetScoringRules
);

// Tool 7: search_universities
server.tool(
  'search_universities',
  'Fuzzy search across the university master database. Handles typos, partial names, and abbreviations. Returns matching universities with rank, grade, and country.',
  {
    query: z.string().describe('Search query (university name, partial name, or abbreviation)'),
    country: z.string().optional().describe('Filter by country name'),
    limit: z.number().optional().default(10).describe('Maximum number of results (default 10)'),
  },
  handleSearchUniversities
);

// Tool 8: list_countries
server.tool(
  'list_countries',
  'Get the list of countries covered and blocked across all education loan lenders.',
  {},
  handleListCountries
);

// Tool 9: list_courses
server.tool(
  'list_courses',
  'Get the list of supported course levels (UG/PG) and course categories with examples.',
  {},
  handleListCourses
);

// Start the server
async function main() {
  const useStdio = process.argv.includes('--stdio');

  if (useStdio) {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('EduLoans BRE MCP Server running on stdio');
  } else {
    const PORT = parseInt(process.env.PORT || '3001', 10);
    const transports: Record<string, SSEServerTransport> = {};

    const httpServer = http.createServer(async (req, res) => {
      const url = new URL(req.url || '/', `http://localhost:${PORT}`);

      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      if (url.pathname === '/sse' && req.method === 'GET') {
        const transport = new SSEServerTransport('/messages', res as any);
        transports[transport.sessionId] = transport;
        await server.connect(transport);

        res.on('close', () => {
          delete transports[transport.sessionId];
        });
      } else if (url.pathname === '/messages' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', async () => {
          const sessionId = url.searchParams.get('sessionId');
          if (!sessionId) {
            res.writeHead(400);
            res.end('Missing sessionId');
            return;
          }
          const transport = transports[sessionId];
          if (transport) {
            await transport.handlePostMessage(req as any, res as any, body);
          } else {
            res.writeHead(404);
            res.end('Session not found');
          }
        });
      } else if (url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'ok',
            server: 'eduloans-bre',
            version: '1.0.0',
            tools: 9,
          })
        );
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    httpServer.listen(PORT, () => {
      console.error(`EduLoans BRE MCP Server running on http://localhost:${PORT}`);
      console.error(`SSE endpoint: http://localhost:${PORT}/sse`);
      console.error(`Health check: http://localhost:${PORT}/health`);
    });
  }
}

main().catch((error) => {
  console.error('Fatal error starting server:', error);
  process.exit(1);
});
