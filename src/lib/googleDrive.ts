import { google } from "googleapis";
import { Readable } from "stream";

export class GoogleDriveService {
    private drive;

    constructor() {
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            "https://developers.google.com/oauthplayground"
        );

        oauth2Client.setCredentials({
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN
        });

        this.drive = google.drive({ version: "v3", auth: oauth2Client });
    }

    async uploadFile(file: File) {
        try {
            const buffer = Buffer.from(await file.arrayBuffer());
            const stream = Readable.from(buffer);

            const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;

            console.log("Encoding folder ID:", process.env.GOOGLE_DRIVE_FOLDER_ID);
            const response = await this.drive.files.create({
                requestBody: {
                    name: uniqueName,
                    mimeType: file.type,
                    parents: process.env.GOOGLE_DRIVE_FOLDER_ID ? [process.env.GOOGLE_DRIVE_FOLDER_ID] : [],
                },
                media: {
                    mimeType: file.type,
                    body: stream,
                },
                fields: "id, webViewLink, webContentLink, thumbnailLink",
            });

            const fileId = response.data.id;

            console.log("File uploaded, ID:", fileId);

            if (fileId) {
                try {
                    const permissionRes = await this.drive.permissions.create({
                        fileId,
                        requestBody: {
                            role: "reader",
                            type: "anyone",
                        },
                    });
                    console.log("Permission created:", permissionRes.data);
                } catch (permError) {
                    console.error("Permission creation failed:", permError);
                }
            }

            return response.data;
        } catch (error) {
            console.error("Google Drive Upload Error:", error);
            throw error;
        }
    }

    async getFileStream(fileId: string) {
        try {
            const response = await this.drive.files.get(
                { fileId, alt: "media" },
                { responseType: "stream" }
            );
            return response.data;
        } catch (error) {
            console.error("Error getting file stream:", error);
            throw error;
        }
    }
}

export const googleDriveService = new GoogleDriveService();
