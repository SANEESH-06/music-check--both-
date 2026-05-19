# EchoWave Music Player

Professional full-stack music player with a Next.js frontend and Fastify + Mongoose backend in separate folders.

## Structure

```text
.
├── backend
│   ├── src
│   │   ├── config
│   │   ├── controllers
│   │   ├── models
│   │   ├── middleware
│   │   ├── routes
│   │   ├── app.js
│   │   └── server.js
│   └── package.json
└── frontend
    ├── app
    ├── components
    ├── lib
    └── package.json
```

## Run Both Apps

Create `backend/.env` first:

```bash
cp backend/.env.example backend/.env
```

Set `MONGO_URI` in `backend/.env`. You can use local MongoDB:

```text
MONGO_URI=mongodb://127.0.0.1:27017/sounddeck
```

Or use MongoDB Atlas.

```bash
npm run dev
```

Frontend runs at `http://localhost:3000`.
Backend runs at `http://127.0.0.1:5000`.

If your terminal does not find `npm`, run this first because Node is installed locally in this project:

```bash
./scripts/setup-node-path.sh
source ~/.zshrc
```

## Run Separately

```bash
npm run dev:backend
npm run dev:frontend
```

## Features

- Music player UI on `http://localhost:3000`
- Fastify tracks API at `http://127.0.0.1:5000/api/tracks`
- Login-first player access with JWT
- Fastify backend for lower overhead than Express
- Users and tracks stored with Mongoose
- Play, pause, previous, next, shuffle, repeat, seek, and volume controls
- Searchable playlist
- Login page still available at `/login`

## Demo Login

If you use the login page, these credentials are available:

```text
Email: admin@example.com
Password: password123
```
