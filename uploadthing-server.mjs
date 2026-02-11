import "dotenv/config";
import express from "express";
import cors from "cors";
import { createUploadthing, createRouteHandler } from "uploadthing/express";

// Configure UploadThing routes for Express
const f = createUploadthing();

const uploadRouter = {
  // Existing route for CVs (PDF + image)
  mediaUploader: f({
    pdf: { maxFileSize: "4MB" },
    image: { maxFileSize: "4MB" },
  }).onUploadComplete(async ({ file }) => {
    console.log("[UploadThing Express][mediaUploader] Upload complete:", {
      name: file.name,
      url: file.url,
      size: file.size,
      key: file.key,
    });
  }),

  // New route for video interview recordings
  videoUploader: f({
    video: { maxFileSize: "64MB" },
  }).onUploadComplete(async ({ file }) => {
    console.log("[UploadThing Express][videoUploader] Upload complete:", {
      name: file.name,
      url: file.url,
      size: file.size,
      key: file.key,
    });
  }),
};

const app = express();

// Simple sanity log so you can confirm the token is loaded
console.log("[UploadThing Express] Using UPLOADTHING_TOKEN:", process.env.UPLOADTHING_TOKEN ? "loaded" : "MISSING");

// Allow your Vite frontend to call this server
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

// Mount the UploadThing route at /api/uploadthing
app.use(
  "/api/uploadthing",
  createRouteHandler({
    router: uploadRouter,
  }),
);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(
    `[UploadThing Express] Server listening at http://localhost:${PORT}/api/uploadthing`,
  );
});

