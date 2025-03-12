import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { AzureOpenAI } from 'openai';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Load azd environment variables
function loadAzdEnv() {
    try {
      const result = execSync('azd env list -o json', { encoding: 'utf-8' });
      const envJson = JSON.parse(result);
      let envFilePath = null;
      for (const entry of envJson) {
        if (entry.IsDefault) {
          envFilePath = entry.DotEnvPath;
          break;
        }
      }
      if (!envFilePath) {
        throw new Error('No default azd env file found');
      }
      console.log(`Loading azd env from ${envFilePath}`);
      dotenv.config({ path: envFilePath, override: true });
    } catch (error) {
      console.error('Error loading azd env:', error);
      process.exit(1);
    }
  }
  
  loadAzdEnv();

// Input file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FILE_FONT_PATH = path.join(__dirname, 'input_files', 'Font.zip');

// Load environment variables
const apiEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-05-01-preview';
const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
let assistantId = process.env.AZURE_OPENAI_ASSISTANT_ID;
let fileFontId = process.env.AZURE_OPENAI_FONT_FILE_ID;

console.log('apiEndpoint:', apiEndpoint);
console.log('apiKey:', apiKey);
console.log('apiVersion:', apiVersion);
console.log('deploymentName:', deploymentName);
console.log('assistantId:', assistantId);
console.log('fileFontId:', fileFontId);

///////////////////////////////////
// File upload to Azure OpenAI   //
///////////////////////////////////
async function uploadFile(client, filePath, fileType) {
  const fileStream = fs.createReadStream(filePath);
  const file = await client.files.create({
    file: fileStream,
    purpose: 'assistants'
  });
  fileStream.close();
  console.log(`${fileType} file uploaded successfully. File ID: ${file.id}`);
  fileFontId = file.id;
  execSync(`azd env set AZURE_OPENAI_FONT_FILE_ID ${file.id}`);
  console.log(`azd env set result is\n: ${azdResult.toString()}`);
}


///////////////////////////////////
// Set up Azure OpenAI Assistant //
///////////////////////////////////
async function createAssistant(client) {
  // アシスタントを作成
  const assistant = await client.beta.assistants.create({
    name: 'AI Assistant for Excel File Analysis',
    model: deploymentName,
    instructions: "You are an AI assistant that analyzes EXCEL files. Please answer user requests in Japanese.",
    tools: [{ type: 'code_interpreter' }],
    tool_resources: { code_interpreter: { file_ids: [fileFontId] } },
  });
  
  assistantId = assistant.id;
  execSync(`azd env set AZURE_OPENAI_ASSISTANT_ID ${assistantId}`);
  console.log(`Assistant created successfully. Assistant ID: ${assistantId}`);
}

async function main() {
  // Create Azure OpenAI client
  const client = new AzureOpenAI({
    apiKey: apiKey,
    apiVersion: apiVersion,
    endpoint: apiEndpoint,
  });

  // Upload font file
  if (!fileFontId) {
    await uploadFile(client, FILE_FONT_PATH, 'Font');
  } else{
    console.log('Font file already uploaded. File ID:', fileFontId);
  }

  // Create assistant
  if(!assistantId){
    await createAssistant(client);
  } else{
    console.log('Assistant already created. Assistant ID:', assistantId);
  }
}

main()