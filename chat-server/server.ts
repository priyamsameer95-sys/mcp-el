import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3001/sse';

let mcpClient: Client | null = null;
let mcpTools: any[] = [];
let aiClient: GoogleGenAI | null = null;

async function initialize() {
  try {
    if (process.env.GEMINI_API_KEY) {
      aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      console.log('Gemini AI Client initialized.');
    } else {
      console.warn('GEMINI_API_KEY is not set. The chatbot will not be able to answer queries.');
    }

    console.log(`Connecting to MCP server at ${MCP_SERVER_URL}...`);
    const transport = new SSEClientTransport(new URL(MCP_SERVER_URL));
    
    mcpClient = new Client({
      name: 'edu-chat-client',
      version: '1.0.0',
    }, {
      capabilities: { tools: {} }
    });

    await mcpClient.connect(transport);
    console.log('Connected to MCP server successfully.');

    // Fetch tools
    const toolsResponse = await mcpClient.listTools();
    mcpTools = toolsResponse.tools;
    console.log(`Loaded ${mcpTools.length} tools from MCP server.`);
  } catch (error) {
    console.error('Error initializing server:', error);
  }
}

// Ensure the connection is kept alive
initialize();

// Format tools for Gemini API
function formatToolsForGemini(tools: any[]) {
  if (tools.length === 0) return undefined;
  
  const functionDeclarations = tools.map(tool => {
    // Gemini expects standard JSON Schema format for parameters
    return {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema
    };
  });
  
  return [{ functionDeclarations }];
}

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  if (!aiClient) {
    return res.status(500).json({ error: 'Gemini AI Client not initialized. Please set GEMINI_API_KEY.' });
  }

  try {
    // Convert generic messages to Gemini format
    const contents = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : m.role,
      parts: [{ text: m.content }]
    }));

    const toolsForGemini = formatToolsForGemini(mcpTools);
    
    // We will do a manual loop to handle tool calls
    let currentContents = [...contents];
    let isToolCalling = true;
    let finalResponseText = '';

    while (isToolCalling) {
      console.log(`Calling Gemini with ${currentContents.length} message parts...`);
      const response = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: currentContents,
        config: {
          tools: toolsForGemini,
          systemInstruction: "You are a Product Manager and UX-focused Loan Advisor at EduLoans. Your goal is to provide a buttery-smooth, premium user experience. You have access to the EduLoans BRE MCP server tools. When a user wants to check loan eligibility:\n1. NEVER dump a massive list of questions on the user. It ruins the UX.\n2. Break the data collection into 3 easy, conversational steps:\n   Step 1: Academic & University Info (10th/12th/Grad scores, University Name, Course Level, Country, Standardized Tests)\n   Step 2: Co-Applicant Profile (Relation, Employment Type, Income, Age, CIBIL)\n   Step 3: Loan & Region (Requested Amount, Collateral, Pincodes)\n3. Ask for the details of ONE step at a time. WAIT for the user's response before proceeding to the next step.\n4. If they provide partial information for a step, acknowledge it and gently ask for the missing bits.\n5. Once all information is gathered, confidently call the evaluate_profile tool and present the results in a clear, highly readable format. Use emojis, bold text, and bullet points to make the output scannable and delightful."
        }
      });

      const call = response.functionCalls?.[0];
      
      if (call && mcpClient) {
        console.log(`LLM requested tool call: ${call.name}`);
        // Add the model's function call to history
        currentContents.push({
          role: 'model',
          parts: [{ functionCall: { name: call.name, args: call.args } }]
        });

        try {
          // Execute the tool
          const result = await mcpClient.callTool({
            name: call.name,
            arguments: call.args as any
          });
          
          let resultText = '';
          if (result.content && result.content.length > 0) {
            resultText = result.content[0].type === 'text' ? result.content[0].text : JSON.stringify(result.content);
          } else {
            resultText = 'Tool executed successfully but returned no text content.';
          }

          // Add the tool result to history
          currentContents.push({
            role: 'user', // Gemini expects function responses as role='user' with functionResponse part
            parts: [{
              functionResponse: {
                name: call.name,
                response: { result: resultText }
              }
            }]
          });
          
        } catch (toolError: any) {
          console.error(`Tool execution error:`, toolError);
          currentContents.push({
            role: 'user',
            parts: [{
              functionResponse: {
                name: call.name,
                response: { error: toolError.message || 'Unknown error occurred' }
              }
            }]
          });
        }
      } else {
        // No more tool calls
        isToolCalling = false;
        finalResponseText = response.text || '';
      }
    }

    res.json({ response: finalResponseText });
  } catch (error: any) {
    console.error('Chat error:', error);
    
    const errorMessage = error.message || '';
    
    // Check for 429 Quota Exceeded error
    if (errorMessage.includes('429') || errorMessage.includes('Quota exceeded')) {
      // Extract retry time if available in the error string
      const retryMatch = errorMessage.match(/retry in ([\d.]+)s/);
      let waitText = 'a few moments';
      
      if (retryMatch && retryMatch[1]) {
        const seconds = Math.ceil(parseFloat(retryMatch[1]));
        waitText = seconds > 60 ? `${Math.ceil(seconds/60)} minutes` : `${seconds} seconds`;
      }
      
      return res.status(429).json({ 
        error: `Our AI is currently experiencing high demand and has reached its quota limit. Please retry in ${waitText}.` 
      });
    }

    res.status(500).json({ error: 'Internal server error. Please try again later.' });
  }
});

app.listen(PORT, () => {
  console.log(`Chat Backend running on http://localhost:${PORT}`);
});
