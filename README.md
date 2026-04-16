# Smart Campus Operations Hub

![Smart Campus Header](https://via.placeholder.com/1200x300.png?text=Smart+Campus+Operations+Hub)

A complete, production-inspired full stack web system designed to manage a university's day-to-day operations seamlessly. From complex facility cataloging and overlap-protected booking to robust maintenance incident ticketing and real-time STOMP WebSocket notifications.

**Author / Group:** GroupXX
**Module:** IT3030 - Programming Applications and Frameworks
**Semester:** 1

## Core Features (QA Checked)
- **Authentication (OAuth 2.0)**: JWT-based local auth + Google Sign-In support. RBAC standard with User, Admin, and Technician roles.
- **Facilities Catalogue**: Complete set of CRUD operations for various university assets with dynamic filtering.
- **Booking Management**: Anti-overlap resource booking with an integrated state machine (Pending -> Approved/Rejected/Cancelled).
- **Maintenance Ticketing**: Up to 3 image attachments allowed per ticket. Comment ownership rules enforced.
- **Real-time Notifications**: Triggered on ticket updates and booking status shifts.

## Tech Stack
- **Backend:** Spring Boot 3.4, Spring Security, Hibernate JPA, MySQL.
- **Frontend:** React, Vite, Axios, Context API, Vanilla CSS with custom design system.
- **CI/CD:** GitHub Actions configured for build + unit tests.

## Sub-Modules Breakdown
- **Member 1 (Facilities catalogue & endpoints)**: Implemented `FacilityController`, `FacilityService`, `Facility` models and frontend pages.
- **Member 2 (Booking workflow & conflict checking)**: Implemented `BookingController`, `@Query` based native time overlap blocking, mapping relations.
- **Member 3 (Incident tickets & attachments)**: Implemented `TicketController`, local FileStorageService handling, comments, dynamic ticket frontend state machine.
- **Member 4 (Notifications & Auth integration)**: Implemented `AuthController`, OAuth Google Provider wrapper, JWT Provider, and `Notification` endpoints.

## How to Run Locally
### Requirements
- Java 21+
- Node.js 22+
- MySQL (Database named `smartcampus` running on port 3306)

### 1. Spring Boot Backend
```bash
cd backend
# Database details are preconfigured in application.properties
./mvnw spring-boot:run
```

### 2. React + Vite Frontend
```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:5173`.
The backend APIs run on `http://localhost:8080/api`.

> **Note on OAuth**: During evaluation, click the "Mock Google Login (Dev Only)" button to test the OAuth auto-registration path seamlessly without needing our Google Developer Console credentials, or update the `clientId` in `main.jsx` with an active app ID.

## 🧪 Testing Evidence
The application includes:
1. `BookingServiceTest.java` and `TicketServiceTest.java` for core business logic Mockito testing. Run `mvn test`.
2. A `smartcampus_postman_collection.json` inside the root directory for broad API evaluations.
