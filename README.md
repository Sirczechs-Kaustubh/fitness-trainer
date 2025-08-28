# Fitness App

## Backend (API)

**Title:** Backend – Fitness API Server

**Description:**
A Node.js/Express REST & WebSocket backend server for authentication, user management, workout tracking, and real-time communication.

### Tech Stack

* Node.js 18+
* Express.js
* MongoDB & Mongoose
* JWT (Authentication)
* Socket.IO
* bcryptjs
* dotenv

### Prerequisites

* Node.js v18 or higher
* npm
* MongoDB (Atlas or Local Installation)

### Installation (Backend)

```bash
# Go to backend folder
cd apps/api

# Install dependencies
npm install
```

### Environment Variables (Backend)

Create a `.env` file inside `apps/api/` with these keys:

```env
MONGO_URI=<your_mongodb_connection>
JWT_SECRET=<your_secret>
PORT=4000
```

### Running the Backend

```bash
# Development
npm run dev

# Production
npm start
```

Default runs at [http://localhost:4000](http://localhost:4000)

### Directory Structure (Backend)

```
apps/api
├─ src
│  ├─ api
│  │  ├─ routes
│  │  │  ├─ auth.routes.js
│  │  │  └─ user.routes.js
│  │  └─ controllers
│  │     ├─ auth.controller.js
│  │     └─ user.controller.js
│  ├─ config
│  │  └─ database.js
│  ├─ middlewares
│  │  └─ auth.middleware.js
│  ├─ models
│  │  ├─ User.model.js
│  │  └─ Workout.model.js
│  ├─ websocket
│  │  └─ index.js
│  ├─ app.js
│  └─ index.js
└─ package.json
```

**License Backend:** MIT © 2025

---

## Frontend (Web)

**Title:** Frontend – Fitness Web App

**Description:**
A Next.js 14 React app with Tailwind CSS, Chart.js, Axios, Socket.IO Client, and MediaPipe integration for fitness dashboards and analytics.

### Tech Stack

* Next.js 14 (App Router)
* React 18
* Tailwind CSS 3
* Chart.js 4 + react-chartjs-2
* Axios
* Socket.IO-client
* MediaPipe Tasks Vision

### Prerequisites

* Node.js v18+
* npm

### Installation (Frontend)

```bash
# Go to frontend folder
cd apps/web

# Install dependencies
npm install
```

### Environment Variables (Frontend)

Create `.env.local` inside `apps/web/` with:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

### Running the Frontend

```bash
# Development (available at http://localhost:3000)
npm run dev

# Production
npm run build
npm start
```

### Directory Structure (Frontend)

```
apps/web
├─ app
│  ├─ layout.jsx
│  ├─ page.jsx
│  ├─ login/page.jsx
│  ├─ register/page.jsx
│  ├─ dashboard/page.jsx
│  └─ profile/page.jsx
├─ components
│  ├─ ui
│  │  ├─ Button.jsx
│  │  ├─ Input.jsx
│  │  └─ Card.jsx
│  └─ dashboard
│     └─ StatCard.jsx
├─ hooks
│  └─ useAuth.js
├─ lib
│  └─ apiClient.js
├─ styles
│  └─ globals.css
└─ package.json
```

**License Frontend:** MIT © 2025
