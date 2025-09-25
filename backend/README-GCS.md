Setup for Google Cloud Storage (GCS)

Environment variables (.env)

Required:
- GCS_BUCKET=tutor-student-videos
- GOOGLE_CLOUD_PROJECT=your-project-id

Credentials (choose ONE):
1) Inline JSON
- GCS_KEYFILE_JSON={"type":"service_account", ...}

2) Base64 JSON
- GCS_KEYFILE_B64=eyJ0eXBlIjoic2VydmljZV9hY2NvdW50IiwiLi4uIn0=

3) File path
- GOOGLE_APPLICATION_CREDENTIALS=C:\\path\\to\\service-account.json

Notes
- Videos (video/*) upload to GCS under uploads/videos/<timestamp>-<file>.
- GET /files/:id/binary redirects to a signed URL for GCS files.
- DELETE cleans up the GCS object before removing the DB record.


