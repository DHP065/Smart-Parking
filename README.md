# Smart Parking System

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat&logo=next.js)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-green?style=flat&logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-brightgreen?style=flat&logo=mongodb)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/RealTime-Socket.IO-white?style=flat&logo=socket.io)](https://socket.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)

A modern, full-stack, real-time smart parking management and slot reservation platform designed to eliminate urban parking congestion, minimize manual operator overhead, and deliver contactless access control. The platform connects motorists, facility administrators, and edge computer-vision camera streams into a unified, responsive ecosystem.

---

## 1. Project Overview

Finding an available parking spot in dense urban areas causes significant traffic delays, unnecessary fuel consumption, and driver frustration. Traditional parking lots often rely on manual ticketing, static signs, or isolated management software that fails to provide real-time visibility to arriving drivers.

**Smart Parking System** provides an end-to-end digital infrastructure that:
- Allows drivers to locate nearby parking lots on an interactive map, view real-time vacancies, and reserve a guaranteed slot in advance.
- Issues verifiable cryptographic **QR code tickets** for contact-free entry gate validation and exit fee reconciliation.
- Synchronizes slot availability instantly across all active clients using bidirectional **Socket.IO** events.
- Features an **Edge Operator Station** capable of processing camera feed coordinates and feeding simulated computer vision detections into the live occupancy database.
- Provides administrators with live occupancy analytics, slot override controls, and revenue monitoring dashboards.

---

## 2. Project Highlights

- **Interactive Geospatial Locator:** Powered by Leaflet and browser Geolocation API, featuring custom status pins, distance calculation, and instant search/filtering across city parking lots.
- **Visual Slot-Grid Selector:** Interactive visual parking layout displaying slot states (**Available**, **Occupied**, **Reserved**) with instantaneous slot booking.
- **Dynamic QR Code Check-In & Check-Out:** Generates secure tokenized entry and exit QR passes. Supports real-time camera scanning via device webcams for barrier-gate check-in and checkout.
- **Real-Time WebSocket Synchronization:** Instantaneous occupancy and slot state changes propagated to all connected clients without page reloads.
- **Edge Vision & Simulation Pipeline:** API endpoints and an Edge Operator UI designed to ingest camera feed detections and map vehicle bounding points to parking slot polygons (`isPointInPolygon` coordinate math).
- **Automated Lifecycle Maintenance:** Node-Cron background workers poll every 30 seconds to automatically expire abandoned reservations, release reserved slots back into the public pool, and broadcast vacancy counts.
- **Role-Based Access Control (RBAC):** Built-in permission gates for `user`, `admin`, and `edge` roles, backed by Firebase Authentication with an offline mock fallback mode for development without third-party credentials.
- **Administrative Analytics Dashboard:** Built with Recharts, tracking occupancy velocity, hourly fees, active reservations, and user accounts.

---

## 3. Recommended Showcase Gallery

> *Note: Production screenshots can be captured and placed into an `assets/screenshots/` directory to visually display the live interfaces in this section.*

| Interface | Purpose & Features Displayed | Suggested Capture Target |
|:---|:---|:---|
| **Driver Map View** | Geolocation marker, nearby lot cards, vacancy status badges, search bar | `frontend/app/page.tsx` |
| **Interactive Slot Grid** | Real-time visual slot grid showing color-coded slot statuses and booking drawer | `frontend/app/parking/[id]/page.tsx` |
| **QR Gate Pass Modal** | Generated digital entry QR pass with countdown timer and lot location details | `frontend/components/reservation/QRModal.tsx` |
| **Admin Operations Dashboard** | Occupancy metrics, historical trend charts, active reservation tables | `frontend/app/admin/dashboard/page.tsx` |
| **Edge Operator Monitor** | CCTV live feed simulator, polygon overlay zones, and manual slot override panel | `frontend/app/edge/monitor/page.tsx` |

---

## 4. Technology Stack

### Frontend Application
- **Framework:** Next.js 14 (App Router)
- **Library:** React 18, TypeScript
- **Styling:** Tailwind CSS, PostCSS
- **Mapping & Geolocation:** Leaflet, React-Leaflet
- **Real-Time Client:** Socket.IO Client
- **Data Visualization:** Recharts
- **Icons & UI:** Lucide React, Sonner (toast notifications)
- **QR Operations:** `qrcode.react`, `@yudiel/react-qr-scanner`
- **Vision Model Integration:** `@tensorflow/tfjs`, `@tensorflow-models/coco-ssd`

### Backend API & Services
- **Runtime Environment:** Node.js (v18+ / v20+)
- **Web Framework:** Express.js 4
- **Database ODM:** Mongoose 8 (MongoDB)
- **Real-Time Engine:** Socket.IO 4
- **Authentication:** Firebase Admin SDK (with mock development support)
- **Scheduled Tasks:** Node-Cron (30-second interval reservation reclamation)
- **Utilities:** `qrcode` (server-side generation), `express-validator`, `uuid`, `dotenv`, `cors`

---

## 5. System Architecture

The following diagram illustrates the interaction between drivers, edge camera feeds, backend services, and database layers:

```mermaid
flowchart TD
    subgraph Clients["Frontend Layer (Next.js 14)"]
        DriverUI["Driver Web App (Map & Booking)"]
        AdminUI["Admin Dashboard (Analytics & Users)"]
        EdgeUI["Edge Operator Console (CCTV & Overrides)"]
    end

    subgraph BackendGateway["Backend Service (Express & Socket.IO)"]
        API["REST API Router (/api/*)"]
        AuthMiddleware["Firebase Auth & Role Guard"]
        SocketServer["Socket.IO Event Hub"]
        CronJob["Cron Worker (Reservation Expiry)"]
    end

    subgraph DataStorage["Data & Auth Tier"]
        MongoDB[("MongoDB Database")]
        FirebaseAuth["Firebase Authentication / Mock Auth"]
    end

    subgraph VisionSource["Edge / Vision Pipeline"]
        CCTV["CCTV Feeds / Test Video Feed"]
        Detector["Edge Detection Endpoint (/api/edge/*)"]
    end

    DriverUI -->|HTTP Requests| API
    AdminUI -->|HTTP Requests| API
    EdgeUI -->|HTTP Requests| API

    DriverUI <-->|Bidirectional Events| SocketServer
    AdminUI <-->|Live Metrics| SocketServer
    EdgeUI <-->|Slot Status| SocketServer

    API --> AuthMiddleware
    AuthMiddleware --> FirebaseAuth
    API --> MongoDB

    CCTV --> Detector
    Detector -->|Slot State Updates| API

    CronJob -->|Check Expired Holds| MongoDB
    CronJob -->|Broadcast lot:status| SocketServer
    SocketServer -->|Emit updates| Clients
```

---

## 6. Features and Workflow

```mermaid
flowchart LR
    A["1. Driver Discovers Lot"] --> B["2. Reserve Slot & Generate QR"]
    B --> C["3. Gate Scanner Verifies QR"]
    C --> D["4. Vehicle Parks (Sensor / Vision Sync)"]
    D --> E["5. Exit Scan & Fee Reconciliation"]
    E --> F["6. Slot Released to Public Pool"]
```

1. **Discovery & Navigation:** Arriving drivers search or browse parking locations via the interactive Leaflet map. Real-time indicators display whether lots are `available`, `reserved`, or `full`.
2. **Reservation & Token Generation:** The driver selects an empty slot. The backend creates a reservation, generates a unique UUID-based QR token, flags the slot as `reserved`, and broadcasts the updated count.
3. **Automated Expiry Watcher:** If the driver does not check in within the expiration window (e.g., 30 minutes), the automated background cron job releases the slot and resets the lot availability count.
4. **Gate Entry & Check-In:** At the facility gate, the QR code is scanned via the operator's scanner or kiosk camera (`QRScannerModal`), transitioning the reservation to `used` and setting the arrival timestamp.
5. **Edge Occupancy Validation:** Computer vision camera feeds analyze vehicle bounding boxes against defined parking slot polygons, reporting changes via `/api/edge/slot-update`.
6. **Checkout & Slot Reclamation:** When leaving, an exit QR code is verified, the parking duration and hourly fee are calculated, and the slot is returned to `empty`.

---

## 7. Repository Structure

```text
Smart-Parking/
├── backend/
│   ├── controllers/
│   │   ├── authController.js          # Authentication, user sync, and role management
│   │   ├── edgeController.js          # Vision feed & slot detection ingestion
│   │   ├── parkingController.js       # Parking lot CRUD & geospatial search
│   │   ├── reservationController.js   # QR ticketing, check-in, checkout & pricing
│   │   └── slotController.js          # Slot coordinates, layouts, and status overrides
│   ├── middleware/
│   │   ├── firebaseAuth.js            # Token verification & offline mock bypass
│   │   └── roleGuard.js               # Role-based endpoint authorization
│   ├── models/
│   │   ├── ParkingLocation.js         # Facility schema (coords, slots, rates, feeds)
│   │   ├── ParkingSlot.js             # Slot schema (label, status, polygon points)
│   │   ├── Reservation.js             # Booking schema (tokens, timestamps, state)
│   │   └── User.js                    # User schema (roles, profile, credentials)
│   ├── routes/
│   │   ├── auth.js                    # Auth endpoints
│   │   ├── edge.js                    # Edge computer-vision endpoints
│   │   ├── parking.js                 # Parking facility endpoints
│   │   ├── reservations.js            # Reservation & QR verification endpoints
│   │   └── slots.js                   # Slot management endpoints
│   ├── socket/
│   │   └── slotEvents.js              # Socket.IO room handling & cron expiry logic
│   ├── .env.example                   # Backend configuration template
│   ├── package.json                   # Backend dependencies & run scripts
│   └── server.js                      # Express application & HTTP server entry point
│
├── frontend/
│   ├── app/
│   │   ├── admin/                     # Admin portal (dashboard, reservations, users)
│   │   ├── auth/                      # Login and registration views
│   │   ├── edge/                      # Edge operator portal (monitor, overrides, feed)
│   │   ├── parking/[id]/              # Slot layout, selection & booking page
│   │   ├── profile/                   # Driver profile management
│   │   ├── reservations/              # User active & historical passes
│   │   ├── layout.tsx                 # Root layout & font configurations
│   │   └── page.tsx                   # Main driver map & locator interface
│   ├── components/
│   │   ├── cctv/                      # Live camera feed monitor components
│   │   ├── map/                       # Leaflet interactive map components
│   │   ├── parking/                   # Interactive parking slot grid
│   │   ├── reservation/               # QR code generation & scanner modals
│   │   └── shared/                    # Navbars, sidebars, and common UI elements
│   ├── lib/
│   │   ├── api.ts                     # Axios client with bearer token interceptors
│   │   ├── auth-context.tsx           # React authentication state provider
│   │   ├── firebase.ts                # Firebase Web SDK initialization
│   │   └── socket.ts                  # Socket.IO singleton client instance
│   ├── .env.example                   # Frontend configuration template
│   ├── next.config.mjs                # Next.js build configuration
│   ├── package.json                   # Frontend dependencies & run scripts
│   ├── tailwind.config.ts             # Tailwind CSS design system configuration
│   └── tsconfig.json                  # TypeScript compiler settings
│
├── stitch_exports/                    # Prototype UI views and reference design templates
├── CONTRIBUTING.md                    # Guidelines for contributing to the repository
├── .gitignore                         # Project-wide Git exclusion rules
└── README.md                          # Technical system documentation
```

---

## 8. Prerequisites

Ensure you have the following installed locally:
- **Node.js:** v18.0.0 or higher (v20+ recommended)
- **Package Manager:** npm (v9+) or yarn / pnpm
- **Database:** MongoDB Community Server running locally on port `27017` or a cloud-hosted MongoDB Atlas URI
- **Web Browser:** Modern browser supporting HTML5 Geolocation and WebSockets (Chrome, Firefox, Edge, Safari)

---

## 9. Installation and Setup

### 1. Clone the Repository
```bash
git clone https://github.com/DHP065/Smart-Parking.git
cd Smart-Parking
```

### 2. Configure Backend Environment
Navigate to the `backend` folder and create a `.env` file based on `.env.example`:
```bash
cd backend
cp .env.example .env
```
*(On Windows PowerShell: `Copy-Item .env.example .env`)*

Configure your `backend/.env` file:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/smart_parking

# Set to 'your-firebase-project-id' to enable built-in offline Mock Auth mode
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-firebase-client-email@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 3. Configure Frontend Environment
Navigate to the `frontend` folder and create a `.env.local` file based on `.env.example`:
```bash
cd ../frontend
cp .env.example .env.local
```
*(On Windows PowerShell: `Copy-Item .env.example .env.local`)*

Configure your `frontend/.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000

# Optional: Firebase Web Client Config (leave defaults for Mock mode)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-firebase-project-id
```

### 4. Install Dependencies
Install dependencies for both projects:

```bash
# Install backend dependencies
cd ../backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

## 10. Running the Project

Start both services concurrently or in separate terminal windows:

### Terminal 1: Backend API & WebSocket Server
```bash
cd backend
npm run dev
```
- **Backend Entry URL:** `http://localhost:5000`
- **Health Check:** `http://localhost:5000/api/health`
- **Socket.IO:** Listening on `ws://localhost:5000`

### Terminal 2: Frontend Web Client
```bash
cd frontend
npm run dev
```
- **Web Client Entry URL:** `http://localhost:3000`

---

## 11. Usage Guide

### User Journey (Motorists)
1. Navigate to `http://localhost:3000`. Allow location permissions to view parking lots closest to your coordinates.
2. Select a parking lot to open the visual layout view (`/parking/:id`).
3. Click any **Available** (green) slot and select **Reserve Slot**.
4. View your digital ticket with the entry QR code under **My Reservations** (`/reservations`).

### Gate Operator / Admin Journey
1. Access the Admin Portal at `http://localhost:3000/admin/dashboard`.
2. Navigate to **Reservations** (`/admin/reservations`) and launch the **QR Scanner**.
3. Scan the user's QR pass to validate gate entry or initiate checkout.
4. Monitor occupancy velocity and capacity statistics on the live dashboard.

### Edge Operator Journey
1. Access `http://localhost:3000/edge/monitor` to view live camera feeds and visual slot statuses.
2. Use `http://localhost:3000/edge/slots` to annotate slot boundary polygons over camera angles.
3. Test batch camera detections via the simulated video stream runner at `http://localhost:3000/edge/test-feed`.

### Offline / Mock Authentication Mode
If you do not have Firebase credentials set up, leave `FIREBASE_PROJECT_ID=your-firebase-project-id` in your `.env` files. The system automatically switches to mock authentication mode, allowing full testing of user, edge, and admin roles without external account creation.

---

## 12. Testing and Validation

### Manual API Verification
You can test the server endpoints using cURL or Postman:

- **Health Check:**
  ```bash
  curl http://localhost:5000/api/health
  # Response: {"status":"ok","timestamp":"..."}
  ```

- **Fetch Parking Locations:**
  ```bash
  curl http://localhost:5000/api/parking
  ```

- **Edge Slot Occupancy Update:**
  ```bash
  curl -X POST http://localhost:5000/api/edge/slot-update \
    -H "Content-Type: application/json" \
    -d "{\"locationId\":\"<LOCATION_ID>\",\"slotLabel\":\"A1\",\"status\":\"occupied\"}"
  ```

### Frontend Code Validation
Run Next.js linting to verify TypeScript and syntax integrity:
```bash
cd frontend
npm run lint
```

---

## 13. Configuration & Troubleshooting

| Issue | Root Cause | Solution |
|:---|:---|:---|
| **MongoDB Connection Error** | MongoDB daemon is not running locally | Ensure MongoDB service is running via `net start MongoDB` or configure a valid Atlas URI in `backend/.env`. |
| **CORS Policy Warning** | Frontend origin port mismatch | Ensure `NEXT_PUBLIC_API_URL` points to the correct backend host (default: `http://localhost:5000`). |
| **Port Conflict (EADDRINUSE)** | Port `5000` or `3000` occupied | Terminate running Node instances or update `PORT` in `backend/.env` and `frontend/.env.local`. |
| **Map Not Centering on User** | Browser geolocation permission denied | The app will fall back to default central coordinates; grant location permissions in browser settings. |
| **Firebase Admin Cert Error** | Malformed private key newline formatting | Ensure private keys in `.env` preserve newline escape sequences (`\n`) or run in Mock mode. |

---

## 14. Security and Privacy

- **Environment Secrets:** Secrets, API credentials, and private keys are isolated inside `.env` files and strictly excluded from version control via `.gitignore`.
- **Tokenized Passes:** Reservation tickets utilize randomized UUID tokens rather than sequential IDs to prevent ticket enumeration attacks.
- **Route Authorization:** Sensitive administrative and edge endpoints are secured via the `roleGuard` middleware (`admin` and `edge` permissions required).
- **Safe Fallbacks:** The mock authentication mechanism is strictly restricted to development environments and logs diagnostic indicators in console outputs.

---

## 15. Limitations and Future Improvements

### Current Scope & Known Limitations
- The camera feed stream in `frontend/app/edge/test-feed` uses client-side simulated video analysis; high-throughput RTSP video decoding is recommended for enterprise deployments.
- Payment checkout currently calculates the hourly fee digitally upon exit scan, but live payment gateway transactions (e.g., Stripe/Razorpay) are not yet integrated.

### Roadmap & Planned Enhancements
- [ ] **Automated License Plate Recognition (ALPR):** Integrate optical character recognition (OCR) at entry/exit gates for hands-free drive-through authentication.
- [ ] **Payment Gateway Integration:** Direct payment processing through Stripe and UPI for instant exit barrier lifting.
- [ ] **IoT Hardware Integration:** MQTT broker bridge to connect physical ultrasonic and geomagnetic slot sensors (ESP32/Raspberry Pi).
- [ ] **Multi-Level Parking Maps:** 3D multi-floor interactive parking structure visualization using Three.js.

---

## 16. Contributing

Contributions are welcome! Please review [CONTRIBUTING.md](CONTRIBUTING.md) for branch naming conventions, commit guidelines, and pull request workflows.

---

## 17. License

This repository is currently maintained as an educational and technical portfolio project. All rights are reserved by the author ([@DHP065](https://github.com/DHP065)). For questions regarding licensing, permissions, or commercial usage, please open an issue on the repository.

---

## 18. Author and Links

- **Author:** [DHP065](https://github.com/DHP065)
- **Repository:** [https://github.com/DHP065/Smart-Parking](https://github.com/DHP065/Smart-Parking)
- **Project Target:** Smart Parking Management System
