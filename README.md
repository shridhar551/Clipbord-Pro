# Infinite Clipboard

Infinite Clipboard is a modern, cloud-style clipboard and file-sharing web app that lets users upload text or files, generate a secure PIN, and retrieve content from any device.

## Features

- Share plain text, code snippets, and long-form notes
- Upload files of any type
- Generate a unique PIN for each upload
- Retrieve content by entering the PIN
- Optional password protection for added security
- Expiration settings for uploads
- QR code sharing support
- Dark/light theme toggle
- Recent PIN tracking and local clipboard history-inspired actions

## Tech Stack

- Frontend: React, TypeScript, Vite
- UI: Framer Motion, Lucide Icons, React QR Code
- Backend: Node.js, Express
- Storage: Local file storage for demo/testing

## Project Structure

- `client/` — frontend application
- `server.js` — backend API server
- `uploads/` — temporary uploaded files

## How to Use

### 1. Start the backend

From the project root:

```bash
node server.js
```

The backend will run at:

- http://localhost:4000

### 2. Start the frontend

From the `client` folder:

```bash
npm install
npm run dev
```

The frontend will run at:

- http://localhost:5173

### 3. Upload content

- Paste text into the editor or drag files into the upload area
- Choose an expiration option if needed
- Add an optional password
- Click **Upload now**

### 4. Share the PIN

After upload, a PIN will be shown in the modal. Share that PIN with anyone who should retrieve the content.

### 5. Retrieve content

- Enter the PIN in the retrieval panel
- Optionally provide the password if one was set
- Click **Retrieve**

## API Endpoints

- `POST /api/upload` — upload text/files and return a PIN
- `GET /api/items/:pin` — retrieve shared content by PIN
- `GET /api/download/:pin` — download the uploaded file
- `GET /health` — health check endpoint
