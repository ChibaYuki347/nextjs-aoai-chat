import { AzureOpenAI } from 'openai';
import { NextResponse } from 'next/server';
import { Message } from 'openai/src/resources/beta/threads/messages.js';
// Create an OpenAI API client (that's edge friendly!)
const client = new AzureOpenAI({
    apiKey: process.env.AZURE_OPENAI_API_KEY || '',
    apiVersion: process.env.AZURE_OPENAI_VERSION || '2024-05-01-preview',
    endpoint: `https://${process.env.AZURE_OPENAI_RESOURCE_NAME}.openai.azure.com/` || '',
  });

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Retry fetching the message if it fails
async function fetchMessageWithRetry(threadId: string, messageId: string, retries: number = MAX_RETRIES): Promise<Message> {
  try {
    const message = await client.beta.threads.messages.retrieve(threadId, messageId);
    return message;
  } catch (error) {
    if (retries > 0) {
      console.warn(`Retrying... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      return fetchMessageWithRetry(threadId, messageId, retries - 1);
    } else {
      throw error;
    }
  }
}


export async function GET(req: Request, { params }: { params: Promise<{ threadId: string, messageId: string }>}): Promise<Response> {
  // Extract the threadId and messageId from the request parameters
  const{ threadId, messageId } = await params;
  console.log('threadId:', threadId);
  console.log('messageId:', messageId);

    if (!threadId && !messageId) {
        return new Response('Thread ID and Message ID are not set', { status: 400 });
    }
    if (!threadId) {
        return new Response('Thread ID is not set', { status: 400 });
    }
    if (!messageId) {
        return new Response('Message ID is not set', { status: 400 });
    }

    try {
      const message = await fetchMessageWithRetry(threadId, messageId);
      console.log('message:', message);
      return NextResponse.json({ ...message }, { status: 200, headers: { 'Content-Type': 'application/json' }});
    }catch (error) {
      console.error('Error fetching the message:', error);    
      return NextResponse.json(
        {error: `Error fetching the message ${(error as Error).message}`},
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
}