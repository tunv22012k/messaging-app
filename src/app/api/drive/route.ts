import { NextRequest, NextResponse } from "next/server";
import { googleDriveService } from "@/lib/googleDrive";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const data = await googleDriveService.uploadFile(file);

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Drive Upload Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
