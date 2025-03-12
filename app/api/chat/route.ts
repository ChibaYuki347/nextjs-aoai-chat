import { createAzure } from "@ai-sdk/azure";
import { streamText } from "ai";
import { CosmosClient } from "@azure/cosmos";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const azure = createAzure({
  resourceName: process.env.AZURE_OPENAI_RESOURCE_NAME,
  apiKey: process.env.AZURE_OPENAI_API_KEY,
});

const cosmosClient = new CosmosClient({
  endpoint: process.env.COSMOS_DB_ENDPOINT || "",
  key: process.env.COSMOS_DB_KEY || "",
});

async function getOrCreateDatabaseAndContainer() {
  const { database } = await cosmosClient.databases.createIfNotExists({
    id: "chatDatabase",
  });
  const { container } = await database.containers.createIfNotExists({
    id: "chatContainer",
  });
  return container;
}

export async function POST(req: Request) {
  // Extract the `messages` from the body of the request
  const { messages, id } = await req.json();

  console.log("chat id", id); // can be used for persisting the chat

  const container = await getOrCreateDatabaseAndContainer();

  // Call the language model
  const result = streamText({
    model: azure("gpt-4o"),
    messages,
    async onFinish({ text, toolCalls, toolResults, usage, finishReason }) {
      // Save chat history to Cosmos DB
      await container.items.create({
        id,
        messages,
        response: text,
        toolCalls,
        toolResults,
        usage,
        finishReason,
        timestamp: new Date().toISOString(),
      });
    },
  });

  // Respond with the stream
  return result.toDataStreamResponse();
}
