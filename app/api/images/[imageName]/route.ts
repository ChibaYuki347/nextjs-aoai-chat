import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";


export async function GET(req: Request,{ params }: { params: Promise<{ imageName: string }>}):Promise<Response>{
    const imageName = (await params).imageName;
    if (!imageName) {
        return NextResponse.json(
            {'message': 'File name is not set'}, { status: 400 });
    }

    const imagePath = path.resolve("public/downloads", imageName);
    if (!fs.existsSync(imagePath)) {
      return NextResponse.json(
        { message: 'File not found' }, { status: 404 }
      );
    }

    const imageFile = fs.readFileSync(`public/downloads/${imageName}`);
    return new NextResponse(imageFile, {
        headers: {
            'Content-Type': 'image/png',
                  'Content-Disposition': `attachment; filename="${imageName}"`
        }
    });
    
}