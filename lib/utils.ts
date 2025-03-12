import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

interface messageApiResponse {
  id: string;
  object: string;
  created: number;
  assistant_id: string;
  thread_id: string;
  run_id: string;
  role: string;
  content: Content[];
  attachments: string[] | null[];
  metadata: Record<string, null>;
}

type Content = ImageFileContent | TextContent;

interface ImageFileContent {
  type: "image_file";
  image_file: {
    file_id: string;
  };
}

type JSONValue =
  | null
  | string
  | number
  | boolean
  | {
      [value: string]: JSONValue;
    }
  | Array<JSONValue>;

interface TextContent {
  type: "text";
  text: {
    value: string;
    annotations: JSONValue[] | undefined;
  };
}

interface messageWIthImageResponse {
  id: string;
  content: string;
  base64Strings?: string[];
  fileNames?: string[];
}

interface fileApiResponse {
  messsage: string;
  fileId: string;
  fileName: string;
  filePath: string;
  base64String: string;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function getMessageWithImage(
  threadId: string,
  messageId: string
): Promise<messageWIthImageResponse> {
  // call /api/threads/{threadId}/messages/{messageId} to get the message
  const response = await fetch(
    `/api/threads/${threadId}/messages/${messageId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch message: ${response.statusText}`);
  }

  const data: messageApiResponse = await response.json();
  console.log("data:", data);
  // Check if data.content exists
  if (!data.content) {
    throw new Error("Content not found in the response");
  }

  // get object from data by using content.text.value and image_file.file_id
  const imageFiles = data.content.filter(
    (content) => content.type === "image_file"
  ) as ImageFileContent[];
  const textContent = data.content.find(
    (content) => content.type === "text"
  ) as TextContent;

  if (imageFiles.length === 0) {
    return { id: data.id, content: textContent.text.value };
  }

  const base64Strings = [];
  const fileNames = [];

  for (const imageFile of imageFiles) {
    const fileId = imageFile.image_file.file_id;
    const fileBase64Encoded = await fetch(`/api/files/${fileId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!fileBase64Encoded.ok) {
      throw new Error(`Failed to fetch file: ${fileBase64Encoded.statusText}`);
    }
    const fileData: fileApiResponse = await fileBase64Encoded.json();
    console.log("fileData:", fileData);

    base64Strings.push(fileData.base64String);
    fileNames.push(fileData.fileName);
  }

  return {
    id: data.id,
    content: textContent.text.value,
    base64Strings: base64Strings,
    fileNames: fileNames,
  };
}
