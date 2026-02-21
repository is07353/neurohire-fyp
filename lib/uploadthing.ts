import { generateReactHelpers } from "@uploadthing/react";

// Use same-origin /uploadthing so when opened via ngrok, Vite proxies to the UploadThing server (no CORS).
const uploadThingUrl =
  typeof window !== "undefined"
    ? `${window.location.origin}/uploadthing`
    : "http://localhost:4000/api/uploadthing";

export const { useUploadThing } = generateReactHelpers({
  url: uploadThingUrl,
});