import { AzureOpenAI } from 'openai';
import { NextResponse } from "next/server";
import fs from 'fs';
import path from "path";

// Create an OpenAI API client (that's edge friendly!)
const client = new AzureOpenAI({
    apiKey: process.env.AZURE_OPENAI_API_KEY || '',
    apiVersion: process.env.AZURE_OPENAI_VERSION || '2024-05-01-preview',
    endpoint: `https://${process.env.AZURE_OPENAI_RESOURCE_NAME}.openai.azure.com/` || '',
  });

const DOWNLOAD_DIR = path.resolve(process.env.ROOT_PATH ?? "", "public/downloads");

export async function GET(req: Request,{ params }: { params: Promise<{ fileId: string }>}):Promise<Response> {
    const fileId = (await params).fileId;
    if (!fileId) {
        return new Response('File ID is not set', { status: 400 });
    }

    try {
      const file = await client.files.content(fileId)
      console.log('file:header', file.headers);
      // get filename(including the extention) from content-disposition header
      const fileName = file.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || "downloadfile.png";
      console.log('fileName:', fileName);

      const bufferView = new Uint8Array(await file.arrayBuffer());
      const base64String = Buffer.from(bufferView).toString('base64');

      // need if you want to save the file locally
      const filePath = path.resolve(DOWNLOAD_DIR, fileName);
  
       if (!fs.existsSync(DOWNLOAD_DIR)) {
            fs.mkdirSync(DOWNLOAD_DIR);
          }
      fs.writeFileSync(filePath, bufferView);

      return NextResponse.json({
        message: 'File downloaded successfully',
        fileId: fileId,
        fileName: fileName,
        filePath: filePath,
        base64String: base64String,
        }, { status: 200, headers: { 'Content-Type': 'application/json' }});
    }catch (error) {
      console.error('Error downloading file:', error);
      return NextResponse.json(
        {error: `Error downloading file ${(error as Error).message}`},
        { status: 500, headers: { 'Content-Type': 'application/json' }});
    }
}




