# Smart Campus Operations Hub

Smart Campus Operations Hub is a full-stack university operations system built with Spring Boot and React. It covers facility/resource management, booking approvals, maintenance tickets with attachments, JWT-based auth, Google sign-in support, and in-app notifications.

## Features
- Facilities and assets catalogue with `GET/POST/PUT/DELETE /api/resources`
- Booking workflow with conflict detection and admin approval/rejection
- Incident ticket workflow with attachments, comments, and status history
- Notification delivery for booking and ticket events
- Role-based access control for `USER`, `ADMIN`, and `TECHNICIAN`

## Tech Stack
- Backend: Java 21, Spring Boot 3.4, Spring Security, Spring Data JPA, MySQL
- Frontend: React 19, Vite 8, Axios, React Router
- CI: GitHub Actions

## Project Structure
```text
.
├── backend
│   ├── src/main/java/com/smartcampus
│   └── src/test/java/com/smartcampus
├── frontend
│   ├── src
│   └── .env.example
├── smartcampus_postman_collection.json
└── .github/workflows/ci.yml
```

## Prerequisites
- Java 21+
- Node.js 22+
- MySQL 8+

## Clone and Setup
```bash
git clone <your-repo-url>
cd PAF
```

### 1. Configure MySQL
Create a MySQL database named `smartcampus`.

The backend currently reads DB settings from [backend/src/main/resources/application.properties](/Users/vinuthanvinuthan/Desktop/PAF/backend/src/main/resources/application.properties:1):

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/smartcampus
spring.datasource.username=root
spring.datasource.password=root1234
```

Update those values if your local MySQL credentials are different.

### 2. Configure Google OAuth
Copy [frontend/.env.example](/Users/vinuthanvinuthan/Desktop/PAF/frontend/.env.example:1) to `.env` inside `frontend/` and set a valid client ID:

```bash
cd frontend
cp .env.example .env
```

```env
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

If you do not have Google OAuth credentials during evaluation, the UI includes mock student/admin sign-in buttons for local testing.

## Run the Backend
```bash
cd backend
./mvnw spring-boot:run
```

Backend base URL:
- `http://localhost:8080/api`

## Run the Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend URL:
- `http://localhost:5173`

## Test Commands
Backend unit tests:
```bash
cd backend
./mvnw test
```

Frontend lint:
```bash
cd frontend
npm run lint
```

Frontend production build:
```bash
cd frontend
npm run build
```

## API Notes
- Facilities/resources are available under both `/api/resources` and `/api/facilities`.
- Booking approval/rejection endpoints support both `PATCH` and `PUT`.
- Ticket workflow supports assignment, reject, resolve, close, attachments, and comment ownership rules.

## Evidence Included
- Service unit tests:
  - [BookingServiceTest.java](/Users/vinuthanvinuthan/Desktop/PAF/backend/src/test/java/com/smartcampus/service/BookingServiceTest.java:1)
  - [TicketServiceTest.java](/Users/vinuthanvinuthan/Desktop/PAF/backend/src/test/java/com/smartcampus/service/TicketServiceTest.java:1)
- Postman collection:
  - [smartcampus_postman_collection.json](/Users/vinuthanvinuthan/Desktop/PAF/smartcampus_postman_collection.json:1)

## CI
GitHub Actions runs on push and pull request using [ci.yml](/Users/vinuthanvinuthan/Desktop/PAF/.github/workflows/ci.yml:1):
- backend Maven test/package
- frontend `npm ci`
- frontend lint
- frontend build
