import { NextRequest, NextResponse } from "next/server";
import { googleDriveService } from "@/lib/googleDrive";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get("id");

    if (!fileId) {
        return NextResponse.json({ error: "No file ID provided" }, { status: 400 });
    }

    try {
        const stream = await googleDriveService.getFileStream(fileId);

        return new NextResponse(stream as any, {
            headers: {
                "Content-Type": "image/jpeg", // We might want to make this dynamic if possible, or just default to jpeg
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    } catch (error) {
        console.error("Image Proxy Error:", error);
        return NextResponse.json({ error: "Failed to fetch image" }, { status: 500 });
    }
}
