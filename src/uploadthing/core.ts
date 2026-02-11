import { createUploadthing, type FileRouter } from "uploadthing/next";

// Initialize the UploadThing helper
const f = createUploadthing();

// Define the file routes used by the client
export const ourFileRouter = {
  mediaUploader: f({
    // CV use-case: allow PDFs and images
    pdf: { maxFileSize: "4MB" },
    image: { maxFileSize: "4MB" },
  }).onUploadComplete(async ({ file }) => {
    // This runs on the server when UploadThing finishes
    console.log("[UploadThing] Upload complete for mediaUploader route:", {
      name: file.name,
      url: file.url,
      size: file.size,
      key: file.key,
    });
  }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;