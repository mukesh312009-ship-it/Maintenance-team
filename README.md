# Smart Campus Management System

> **A Modern, Full-Stack Web Application for College Maintenance Operations**  
> Developed specifically to solve two critical operational challenges faced by college maintenance departments:  
> 1. **Staff Biometric Attendance Tracking & Hardware Integration**  
> 2. **Inter-College Event Resource & Seating Logistics Management**

---

## 📌 Executive Summary & Problem Solutions

### Problem 1: Staff Biometric Attendance Compliance
* **Issue Identified:** College maintenance, carpentry, electrical, and housekeeping staff members were not consistently punching their biometric attendance, making it difficult for the maintenance foreman and supervisor to monitor workforce availability.
* **Our Solution:**
  * **Real-time Attendance Dashboard:** Instant KPI cards displaying Total Staff, Present Staff, Absent Staff, and Pending / Not Checked In personnel with attendance percentage.
  * **Search & Department Filters:** Quick filtering by department (Maintenance, Electrical & HVAC, Civil & Carpentry, IT & Audio/Visual, Security, Administration) and real-time search.
  * **Dual-Track Verification (Manual vs Biometric):**
    * **Administrative Manual Override (Prototype):** Allows supervisors to record manual overrides with timestamps and audit remarks. *The system prominently badges these records as "Manual Override" so they are never misrepresented as actual biometric verifications.*
    * **Authorized Hardware Biometric Gateway API:** A production-ready REST endpoint (`POST /api/biometric/sync`) protected with API Key authorization. Hardware optical thumb scanners and facial recognition terminals (e.g. ZKTeco, eSSL, Suprema) push real-time verification logs directly to the system.
  * **Interactive Hardware Simulator:** Built-in terminal simulation tool allowing maintenance evaluators to test hardware scans with adjustable confidence scores (e.g., 99.4%) and inspect raw telemetry packets.

---

### Problem 2: Inter-College Event Resource Planning
* **Issue Identified:** During inter-college symposiums, fests, hackathons, and sports meets, external attendees and VIP guests visit campus. The maintenance team previously struggled to estimate chairs, tables, and logistics, resulting in last-minute chair shortages and chaotic setups.
* **Our Solution:**
  * **Automated Mathematical Resource Engine:**
    $$\text{Total Expected Participants} = \text{Students} + \text{Staff/Faculty} + \text{VIP Guests}$$
    $$\text{Extra Safety Buffer Chairs} = \text{Round}\left(\text{Total Participants} \times \frac{\text{Buffer \%}}{100}\right)$$
    $$\text{Total Chairs Required} = \text{Total Expected Participants} + \text{Extra Safety Buffer Chairs}$$
    * **Example (from Problem Specification):**  
      200 Students + 20 Staff + 30 Guests = **250 Total Attendees**  
      10% Safety Buffer = **25 Extra Chairs**  
      Total Chairs Required to Deploy = **275 Chairs**.
  * **Intelligent Table Allocation Breakdown:**
    * **Registration Desks:** 1 table per 60 students (minimum 2 counters).
    * **VIP Stage Dais:** 2 executive dais tables with crest skirts.
    * **VIP / Judge Hospitality:** 1 table per 8 dignitaries.
    * **Refreshment / Water Counters:** Scaled dynamically to crowd volume.
  * **Automated Maintenance Work Orders:** Creating an event automatically generates maintenance task tickets for the carpentry and housekeeping crews (e.g. "Deploy 275 cushioned chairs to Main Auditorium").
  * **Printable Resource Work Order Slips & PDF:** 1-click printable requisition slips complete with warehouse dispatch checklists, venue capacity validation, and supervisor signature lines.

---

## 🎨 UI/UX Design System

Adheres strictly to the requested professional college administration design language:
* **Palette:**
  * Dark Navy Blue: `#0f172a` & `#1e3a8a`
  * Clean Crisp White: `#ffffff`
  * Light Sky Blue Accents: `#e0f2fe` & `#0284c7`
  * Subtle Slate Grey: `#f8fafc`, `#f1f5f9`, `#e2e8f0`, `#64748b`
* **Layout:**
  * Fixed, responsive sidebar navigation with mobile collapsible drawer.
  * Sticky top header with live real-time campus clock and biometric terminal health monitor.
  * Responsive statistics cards, hoverable data tables, and modal forms with backdrop blur.
  * Dedicated `@media print` CSS for clean printouts of maintenance slips and attendance sheets.

---

## 💻 Technology Stack

* **Frontend:**
  * **HTML5:** Semantic, accessible layout.
  * **CSS3:** Custom responsive styling (Grid, Flexbox, College Theme variables, Print styles).
  * **JavaScript (ES6+):** Modular client-side architecture (`api.js`, `app.js`, `dashboard.js`, `attendance.js`, `events.js`, `calculator.js`, `tasks.js`, `biometric.js`).
  * **Data Visualizations:** Chart.js for 7-day attendance trends and department distribution.
* **Backend:**
  * **Node.js & Express.js:** Fast, modular RESTful API architecture.
  * **Database:** SQLite (`campus_management.db`) utilizing Node's native `node:sqlite` for zero-friction Windows compilation and persistent ACID storage.
  * **Seed Data:** Preloaded with 20 realistic staff records, 5-day historical attendance, active biometric terminals, 4 inter-college events, and maintenance work orders.

---

## 🚀 How to Run the Project Locally

### Prerequisites
* **Node.js** v18 or newer installed ([Download Node.js](https://nodejs.org/)).

### Steps to Run

1. **Open your terminal or command prompt** in the project directory:
   ```bash
   cd "C:\Users\ADMIN\Downloads\DT Farmer"
   ```

2. **Install dependencies** (if not already installed):
   ```bash
   npm install
   ```

3. **Start the Smart Campus Server:**
   ```bash
   npm start
   ```
   *(Or run directly: `node server.js`)*

4. **Open your browser and visit:**
   ```text
   http://localhost:3000
   ```
   *To access the Admin / Supervisor Login Page directly:*
   ```text
   http://localhost:3000/login.html
   ```

---

## 🔑 Demo Login Credentials

The system includes pre-configured demo user accounts with 1-click quick-fill buttons:

| Role | Username / Email | Password | Full Name | Access Level |
| :--- | :--- | :--- | :--- | :--- |
| **Maintenance Supervisor** | `maintenance` or `maintenance@campus.edu` | `maint123` | Er. Suresh Patil | Full Maintenance Dashboard & Task Management |
| **Dean of Infrastructure (Admin)** | `admin` or `admin@campus.edu` | `admin123` | Dr. Ramesh Sharma | Full Administrative & Biometric Gateway Access |
| **Event Convener** | `coordinator` or `events@campus.edu` | `events123` | Prof. Sunita Deshmukh | Event Planning & Resource Requisition |

---

## 📡 Biometric Hardware REST API Specification

To connect actual physical biometric readers (ZKTeco, Suprema, eSSL, Realtime) to the campus system:

* **Endpoint:** `POST /api/biometric/sync`
* **Headers:**
  ```http
  Content-Type: application/json
  Authorization: Bearer BIO_KEY_GATE01_SECURE
  ```
* **Payload Structure:**
  ```json
  {
    "device_id": "BIO-GATE-01",
    "staff_id": "STF-101",
    "punch_type": "CHECK_IN",
    "verification_type": "Fingerprint",
    "confidence_score": 99.4,
    "timestamp": "08:52 AM"
  }
  ```
* **cURL Command:**
  ```bash
  curl -X POST http://localhost:3000/api/biometric/sync \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer BIO_KEY_GATE01_SECURE" \
    -d '{"device_id":"BIO-GATE-01","staff_id":"STF-101","punch_type":"CHECK_IN","verification_type":"Fingerprint","confidence_score":99.4}'
  ```

---

## 📂 Project Directory Structure

```
DT Farmer/
├── campus_management.db        # Persistent SQLite database file
├── database.js                 # Schema definitions, table setup & seed populator
├── server.js                   # Express REST API, CORS & static asset server
├── package.json                # Project manifest and scripts
├── README.md                   # Complete documentation
└── public/
    ├── index.html              # Main Single-Page Application
    ├── login.html              # Admin & Supervisor Login Portal
    ├── css/
    │   └── style.css           # Custom College Admin Theme & Print Styles
    └── js/
        ├── api.js              # REST client wrapper
        ├── app.js              # Application core, router, modals & toast system
        ├── dashboard.js        # Central maintenance KPIs & Chart.js visualizations
        ├── attendance.js       # Module 1: Staff Biometric & Manual Attendance
        ├── events.js           # Module 2: Event Resource Planning & Calculation
        ├── calculator.js       # Interactive Resource Estimation Sandbox
        ├── tasks.js            # Maintenance Work Orders & Staging Checklists
        └── biometric.js        # Biometric Gateway Hub & Hardware Simulator
```

---

## ✅ Feature Checklist Verification

- [x] Modern, responsive college administration theme (Navy Blue, White, Light Blue, Subtle Grey).
- [x] Staff Attendance dashboard with Present, Absent, and Not Checked In status.
- [x] Manual attendance override for prototype with explicit auditing flags.
- [x] Architecture ready for authorized biometric device integration (`/api/biometric/sync`).
- [x] Live Biometric Hardware Scanner Simulator with adjustable confidence scores.
- [x] Inter-College event planning with participant breakdown (Students, Staff, Guests).
- [x] Exact automated chair calculation: Total Attendees + 10% buffer (e.g. 250 -> 275 chairs).
- [x] Automated table, volunteer, and water dispenser estimation.
- [x] Central Maintenance Dashboard with Chart.js line and bar charts.
- [x] Maintenance Work Orders & Task checklist with status toggles.
- [x] CSV Attendance Export and 1-Click Printable Work Order Requisition Slips.
- [x] Persistent SQLite database ensuring data survives browser refresh and server reboot.
- [x] Admin & Supervisor login authentication portal.
