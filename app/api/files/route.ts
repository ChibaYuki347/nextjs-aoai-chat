import { AzureOpenAI } from "openai";
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import AdmZip from "adm-zip";


// Create an OpenAI API client (that's edge friendly!)
const client = new AzureOpenAI({
    apiKey: process.env.AZURE_OPENAI_API_KEY || '',
    apiVersion: process.env.AZURE_OPENAI_VERSION || '2024-05-01-preview',
    endpoint: `https://${process.env.AZURE_OPENAI_RESOURCE_NAME}.openai.azure.com/` || '',
  });


const UPLOAD_DIR = path.resolve(process.env.ROOT_PATH ?? "", "public/uploads");

// zip archive file upload directory
async function zipFiles(filePath: string) {
  const zip = new AdmZip();
  zip.addLocalFile(filePath)
  const zipFIlePath = filePath + ".zip";
  await zip.writeZipPromise(zipFIlePath);
  return zipFIlePath;
}

// file upload function
async function uploadFile(
  client: AzureOpenAI,
  filePath: string
): Promise<string> {
  const fileStream = fs.createReadStream(filePath);
  const file = await client.files.create({
    file: fileStream,
    purpose: "assistants",
  });
  console.log(`file uploaded successfully. File ID: ${file.id}`);
  return file.id;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const body = Object.fromEntries(formData);
    const file = (body.file as Blob) || null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR);
    }

    const filePath = path.resolve(UPLOAD_DIR, (body.file as File).name);

    fs.writeFileSync(filePath, buffer);

    let uploadFilePath = filePath;

    // Check file extension and zip if necessary
    const fileExtension = path.extname(filePath).toLowerCase();
    if (fileExtension !== '.zip') {
      uploadFilePath = await zipFiles(filePath);
      fs.unlinkSync(filePath); // Delete the original file after zipping
      }

    // file upload to Azure OpenAI
    const fileId = await uploadFile(client, uploadFilePath);

    // file delete from local
    fs.unlinkSync(uploadFilePath); // Delete the file after uploading

    return NextResponse.json({ fileId },{ status: 200 });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}