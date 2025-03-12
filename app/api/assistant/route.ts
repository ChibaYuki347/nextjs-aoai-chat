import { AssistantResponse } from 'ai';
import { AzureOpenAI } from 'openai';

// Create an OpenAI API client (that's edge friendly!)
const client = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY || '',
  apiVersion: process.env.AZURE_OPENAI_VERSION || '2024-05-01-preview',
  endpoint: `https://${process.env.AZURE_OPENAI_RESOURCE_NAME}.openai.azure.com/` || '',
});

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  // Parse the request body
  const input: {
    threadId: string | null;
    message: string;
    fileId: string | null;
  } = await req.json();

  if(!input.fileId) {
    return new Response('File ID is not set', { status: 400 });
  }

  // Type assertion to ensure fileId is a string
  const fileIdString: string = input.fileId;

  // Create a thread if needed
  const threadId = input.threadId ?? (await client.beta.threads.create({
    messages: [{
      role: 'user',
      content: 'アップロードされた Font.zip と Excel.zip を /mnt/data/upload_files に展開してください。これらの ZIP ファイルには解析対象の EXCEL ファイルと日本語フォント NotoSansJP.ttf が含まれています。展開した先にある EXCEL ファイルをユーザーの指示に従い解析してください。EXCEL データからグラフやチャート画像を生成する場合、タイトル、軸項目、凡例等に NotoSansJP.ttf を利用してください。',
      attachments: [
        {
          "file_id": fileIdString,
          "tools": [{ "type": "code_interpreter" }]
        }]
    }]
  })).id;

  console.log('threadId:', threadId); // can be used for persisting the chat

  // Add a message to the thread
  const createdMessage = await client.beta.threads.messages.create(
    threadId,
    {
      role: 'user',
      content: input.message,
    },
    { signal: req.signal },
  );

  return AssistantResponse(
    { threadId, messageId: createdMessage.id },
    async ({ forwardStream }) => {
      // Run the assistant on the thread
      const runStream = client.beta.threads.runs.stream(
        threadId,
        {
          assistant_id:
            process.env.ASSISTANT_ID ??
            (() => {
              throw new Error('ASSISTANT_ID is not set');
            })(),
        },
        { signal: req.signal },
      );
      return forwardStream(runStream)
    }
  )
}