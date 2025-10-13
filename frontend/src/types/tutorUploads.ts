// Mirrors tutorUpload.schema.ts (tutorId, subject, subtopic, title, description, content)
export type TutorUpload = {
  id: string;
  tutorId: string; // references Tutor._id
  subject: string;
  subtopic: string;
  title: string;
  description?: string;
  contentType: string;
  size?: number;
  uploadDate?: string; // This is createdAt from schema
  // On the wire you’ll likely NOT send the raw Buffer; consider a URL from your API instead:
  contentUrl?: string; // optional signed URL or route to download the file
  createdAt?: string;
  updatedAt?: string;
};
