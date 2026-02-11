import { generateReactHelpers } from "@uploadthing/react";

// React-side helpers for talking to the UploadThing Express server
// Backend will run on http://localhost:4000/api/uploadthing
export const { useUploadThing } = generateReactHelpers({
  url: "http://localhost:4000/api/uploadthing",
});