const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'campus_management.db');
const db = new DatabaseSync(DB_PATH);

// Enable foreign keys and WAL mode
db.exec('PRAGMA foreign_keys = ON;');

function initDatabase() {
  // 1. Users Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff',
      full_name TEXT NOT NULL,
      designation TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Staff Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      designation TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      shift TEXT DEFAULT 'General (09:00 AM - 05:00 PM)',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. Attendance Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL, -- 'Present', 'Absent', 'Not Checked In'
      check_in TEXT,
      check_out TEXT,
      method TEXT DEFAULT 'Manual Entry', -- 'Biometric Device', 'Manual Entry', 'Pending'
      device_id TEXT,
      remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(staff_id, date),
      FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE
    );
  `);

  // 4. Biometric Devices Table (Hardware Device Registry)
  db.exec(`
    CREATE TABLE IF NOT EXISTS biometric_devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      device_type TEXT DEFAULT 'Optical Fingerprint + Face AI',
      api_key TEXT NOT NULL,
      status TEXT DEFAULT 'Online', -- 'Online', 'Offline', 'Syncing'
      last_sync DATETIME
    );
  `);

  // 5. Biometric Raw Device Logs (Audit Trail for Hardware Device Sync)
  db.exec(`
    CREATE TABLE IF NOT EXISTS biometric_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      staff_id TEXT NOT NULL,
      punch_time DATETIME NOT NULL,
      punch_type TEXT NOT NULL, -- 'CHECK_IN', 'CHECK_OUT'
      verification_type TEXT DEFAULT 'Fingerprint', -- 'Fingerprint', 'Facial Recognition', 'RFID Card'
      confidence_score REAL DEFAULT 99.2,
      raw_payload TEXT,
      processed_status TEXT DEFAULT 'Processed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 6. Events Table (Inter-College Event & Resource Planning)
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_name TEXT NOT NULL,
      event_date TEXT NOT NULL,
      event_time TEXT NOT NULL,
      event_type TEXT NOT NULL,
      participating_colleges TEXT NOT NULL,
      expected_students INTEGER NOT NULL DEFAULT 0,
      expected_staff INTEGER NOT NULL DEFAULT 0,
      expected_guests INTEGER NOT NULL DEFAULT 0,
      total_participants INTEGER NOT NULL DEFAULT 0,
      buffer_percentage REAL NOT NULL DEFAULT 10.0,
      extra_chairs INTEGER NOT NULL DEFAULT 0,
      total_chairs INTEGER NOT NULL DEFAULT 0,
      estimated_tables INTEGER NOT NULL DEFAULT 0,
      required_volunteers INTEGER NOT NULL DEFAULT 0,
      venue TEXT NOT NULL,
      venue_capacity INTEGER DEFAULT 500,
      additional_requirements TEXT,
      status TEXT DEFAULT 'Planning', -- 'Planning', 'Approved', 'Setup In Progress', 'Completed', 'Cancelled'
      organizer_contact TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 7. Maintenance Tasks / Work Orders Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS maintenance_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      event_id INTEGER,
      category TEXT NOT NULL, -- 'Seating', 'Electrical', 'Audio/Visual', 'Housekeeping', 'Civil'
      assigned_to TEXT,
      priority TEXT DEFAULT 'Medium', -- 'Low', 'Medium', 'High', 'Urgent'
      status TEXT DEFAULT 'Pending', -- 'Pending', 'In Progress', 'Completed'
      due_date TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
    );
  `);

  seedInitialData();
}

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function seedInitialData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) {
    return; // Already seeded
  }

  console.log('Seeding initial demonstration data for Smart Campus Management System...');

  // 1. Seed Users
  const insertUser = db.prepare(`
    INSERT INTO users (username, email, password, role, full_name, designation)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertUser.run('admin', 'admin@campus.edu', 'admin123', 'admin', 'Dr. Ramesh Sharma', 'Dean of Infrastructure & Maintenance');
  insertUser.run('maintenance', 'maintenance@campus.edu', 'maint123', 'supervisor', 'Er. Suresh Patil', 'Chief Maintenance Supervisor');
  insertUser.run('coordinator', 'events@campus.edu', 'events123', 'coordinator', 'Prof. Sunita Deshmukh', 'Inter-College Event Convener');

  // 2. Seed Biometric Devices
  const insertDevice = db.prepare(`
    INSERT INTO biometric_devices (device_id, name, location, ip_address, device_type, api_key, status, last_sync)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  insertDevice.run('BIO-GATE-01', 'Main Campus Gate Terminal', 'Main Security Checkpoint', '192.168.10.41', 'Face Recognition + Biometric Thumb', 'BIO_KEY_GATE01_SECURE', 'Online');
  insertDevice.run('BIO-ADMIN-02', 'Admin Block Ground Floor Scanner', 'Central Administrative Office Foyer', '192.168.10.42', 'Optical High-Speed Fingerprint', 'BIO_KEY_ADMIN02_SECURE', 'Online');
  insertDevice.run('BIO-MAINT-03', 'Maintenance & Workshop Terminal', 'Central Engineering Workshop Bay', '192.168.10.43', 'Ruggedized Biometric Sensor', 'BIO_KEY_MAINT03_SECURE', 'Online');
  insertDevice.run('BIO-AUDI-04', 'Auditorium & Events Wing Terminal', 'Main Auditorium Stage Entrance', '192.168.10.44', 'Smart Card + Face Terminal', 'BIO_KEY_AUDI04_SECURE', 'Online');

  // 3. Seed Staff Members (20 staff across key departments)
  const staffList = [
    { id: 'STF-101', name: 'Rajesh Kumar Verma', dept: 'Maintenance & Housekeeping', desig: 'Head Maintenance Foreman', email: 'rajesh.verma@campus.edu', phone: '+91 98230 11201', shift: 'Morning (07:30 AM - 03:30 PM)' },
    { id: 'STF-102', name: 'Anil Gangadhar Shinde', dept: 'Electrical & HVAC', desig: 'Senior Campus Electrician', email: 'anil.shinde@campus.edu', phone: '+91 98230 11202', shift: 'General (09:00 AM - 05:00 PM)' },
    { id: 'STF-103', name: 'Mahesh Babanrao Kadam', dept: 'Civil & Carpentry', desig: 'Master Carpenter & Seating Lead', email: 'mahesh.kadam@campus.edu', phone: '+91 98230 11203', shift: 'Morning (07:30 AM - 03:30 PM)' },
    { id: 'STF-104', name: 'Pooja Nitin Deshpande', dept: 'Administrative Office', desig: 'Records Officer', email: 'pooja.deshpande@campus.edu', phone: '+91 98230 11204', shift: 'General (09:00 AM - 05:00 PM)' },
    { id: 'STF-105', name: 'Sanjay Tukaram Jadhav', dept: 'Maintenance & Housekeeping', desig: 'Housekeeping Coordinator', email: 'sanjay.jadhav@campus.edu', phone: '+91 98230 11205', shift: 'Morning (07:30 AM - 03:30 PM)' },
    { id: 'STF-106', name: 'Dinesh Chandra Joshi', dept: 'IT Infrastructure & Audio/Visual', desig: 'AV Systems Technician', email: 'dinesh.joshi@campus.edu', phone: '+91 98230 11206', shift: 'General (09:00 AM - 05:00 PM)' },
    { id: 'STF-107', name: 'Kavita Sundaram Iyer', dept: 'Computer Science & Engg', desig: 'Lab Administrator', email: 'kavita.iyer@campus.edu', phone: '+91 98230 11207', shift: 'General (09:00 AM - 05:00 PM)' },
    { id: 'STF-108', name: 'Vikram Singh Rathore', dept: 'Campus Security', desig: 'Security Supervisor', email: 'vikram.rathore@campus.edu', phone: '+91 98230 11208', shift: 'Morning (06:00 AM - 02:00 PM)' },
    { id: 'STF-109', name: 'Manoj Prabhakar More', dept: 'Electrical & HVAC', desig: 'AC Plant Operator', email: 'manoj.more@campus.edu', phone: '+91 98230 11209', shift: 'General (09:00 AM - 05:00 PM)' },
    { id: 'STF-110', name: 'Santosh Narayan Patil', dept: 'Civil & Carpentry', desig: 'Plumbing & Water Supply Incharge', email: 'santosh.patil@campus.edu', phone: '+91 98230 11210', shift: 'Morning (07:30 AM - 03:30 PM)' },
    { id: 'STF-111', name: 'Sunil Jagdish Solanki', dept: 'Maintenance & Housekeeping', desig: 'Hall Setup Technician', email: 'sunil.solanki@campus.edu', phone: '+91 98230 11211', shift: 'Morning (07:30 AM - 03:30 PM)' },
    { id: 'STF-112', name: 'Geeta Mohan Kulkarni', dept: 'Administrative Office', desig: 'Event Logistics Assistant', email: 'geeta.kulkarni@campus.edu', phone: '+91 98230 11212', shift: 'General (09:00 AM - 05:00 PM)' },
    { id: 'STF-113', name: 'Praveen Kumar Nair', dept: 'IT Infrastructure & Audio/Visual', desig: 'Network & Smart Classroom Engg', email: 'praveen.nair@campus.edu', phone: '+91 98230 11213', shift: 'General (09:00 AM - 05:00 PM)' },
    { id: 'STF-114', name: 'Ajay Vasant Gaikwad', dept: 'Maintenance & Housekeeping', desig: 'Sanitation Inspector', email: 'ajay.gaikwad@campus.edu', phone: '+91 98230 11214', shift: 'Morning (07:30 AM - 03:30 PM)' },
    { id: 'STF-115', name: 'Neeta Rakesh Saxena', dept: 'Administrative Office', desig: 'Accounts & Vendor Clerk', email: 'neeta.saxena@campus.edu', phone: '+91 98230 11215', shift: 'General (09:00 AM - 05:00 PM)' },
    { id: 'STF-116', name: 'Ganesh Pandurang Salve', dept: 'Civil & Carpentry', desig: 'Stage & Furniture Fabricator', email: 'ganesh.salve@campus.edu', phone: '+91 98230 11216', shift: 'Morning (07:30 AM - 03:30 PM)' },
    { id: 'STF-117', name: 'Deepak Harishchandra Rao', dept: 'Electrical & HVAC', desig: 'Backup Generator Technician', email: 'deepak.rao@campus.edu', phone: '+91 98230 11217', shift: 'General (09:00 AM - 05:00 PM)' },
    { id: 'STF-118', name: 'Priyanka Ashok Shinde', dept: 'Computer Science & Engg', desig: 'Technical Assistant', email: 'priyanka.shinde@campus.edu', phone: '+91 98230 11218', shift: 'General (09:00 AM - 05:00 PM)' },
    { id: 'STF-119', name: 'Bhimrao S. Waghmare', dept: 'Maintenance & Housekeeping', desig: 'Grounds & Landscaping Staff', email: 'bhimrao.w@campus.edu', phone: '+91 98230 11219', shift: 'Morning (07:00 AM - 03:00 PM)' },
    { id: 'STF-120', name: 'Arun Devidas Mane', dept: 'Campus Security', desig: 'Main Gate Control Guard', email: 'arun.mane@campus.edu', phone: '+91 98230 11220', shift: 'Morning (06:00 AM - 02:00 PM)' }
  ];

  const insertStaff = db.prepare(`
    INSERT INTO staff (staff_id, name, department, designation, email, phone, shift)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const s of staffList) {
    insertStaff.run(s.id, s.name, s.dept, s.desig, s.email, s.phone, s.shift);
  }

  // 4. Seed Today's Attendance (Demonstrating Problem 1: Staff Biometric Attendance)
  const today = getTodayString();
  const insertAttendance = db.prepare(`
    INSERT INTO attendance (staff_id, date, status, check_in, check_out, method, device_id, remarks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertBioLog = db.prepare(`
    INSERT INTO biometric_logs (device_id, staff_id, punch_time, punch_type, verification_type, confidence_score, raw_payload)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Staff 1 to 11 are Present (some via Biometric Device, some via Manual Override)
  // Staff 12 to 15 are Absent (with remarks)
  // Staff 16 to 20 are Not Checked In / Pending
  const attendanceToday = [
    { staff_id: 'STF-101', status: 'Present', in: '07:28 AM', out: null, method: 'Biometric Device', dev: 'BIO-MAINT-03', rem: 'Normal on-time entry' },
    { staff_id: 'STF-102', status: 'Present', in: '08:52 AM', out: null, method: 'Biometric Device', dev: 'BIO-GATE-01', rem: 'Normal on-time entry' },
    { staff_id: 'STF-103', status: 'Present', in: '07:35 AM', out: null, method: 'Biometric Device', dev: 'BIO-MAINT-03', rem: 'Fingerprint verified (99.1%)' },
    { staff_id: 'STF-104', status: 'Present', in: '08:59 AM', out: null, method: 'Biometric Device', dev: 'BIO-ADMIN-02', rem: 'Normal on-time entry' },
    { staff_id: 'STF-105', status: 'Present', in: '07:40 AM', out: null, method: 'Manual Entry', dev: 'MANUAL', rem: 'Biometric device sensor failed thumb scan; verified manually by Supervisor Patil' },
    { staff_id: 'STF-106', status: 'Present', in: '09:05 AM', out: null, method: 'Biometric Device', dev: 'BIO-ADMIN-02', rem: 'Face scan verified' },
    { staff_id: 'STF-107', status: 'Present', in: '09:12 AM', out: null, method: 'Biometric Device', dev: 'BIO-GATE-01', rem: 'Late check-in recorded' },
    { staff_id: 'STF-108', status: 'Present', in: '05:58 AM', out: null, method: 'Biometric Device', dev: 'BIO-GATE-01', rem: 'Morning security shift' },
    { staff_id: 'STF-109', status: 'Present', in: '08:48 AM', out: null, method: 'Biometric Device', dev: 'BIO-MAINT-03', rem: 'Normal on-time entry' },
    { staff_id: 'STF-110', status: 'Present', in: '07:42 AM', out: null, method: 'Manual Entry', dev: 'MANUAL', rem: 'Staff reported forgot RFID card, manual verification by HOD' },
    { staff_id: 'STF-111', status: 'Present', in: '07:31 AM', out: null, method: 'Biometric Device', dev: 'BIO-AUDI-04', rem: 'Setup duty at Auditorium' },
    { staff_id: 'STF-112', status: 'Absent', in: null, out: null, method: 'Pending', dev: null, rem: 'Medical Leave approved (Fever)' },
    { staff_id: 'STF-113', status: 'Absent', in: null, out: null, method: 'Pending', dev: null, rem: 'Official On-Duty visit to Central University' },
    { staff_id: 'STF-114', status: 'Absent', in: null, out: null, method: 'Pending', dev: null, rem: 'Casual Leave sanctioned' },
    { staff_id: 'STF-115', status: 'Absent', in: null, out: null, method: 'Pending', dev: null, rem: 'Uninformed absence - Alert sent to HOD' },
    { staff_id: 'STF-116', status: 'Not Checked In', in: null, out: null, method: 'Pending', dev: null, rem: 'Shift started at 07:30 AM - Biometric punch missing' },
    { staff_id: 'STF-117', status: 'Not Checked In', in: null, out: null, method: 'Pending', dev: null, rem: 'Pending verification' },
    { staff_id: 'STF-118', status: 'Not Checked In', in: null, out: null, method: 'Pending', dev: null, rem: 'Pending verification' },
    { staff_id: 'STF-119', status: 'Not Checked In', in: null, out: null, method: 'Pending', dev: null, rem: 'Field duty without punch' },
    { staff_id: 'STF-120', status: 'Not Checked In', in: null, out: null, method: 'Pending', dev: null, rem: 'Pending verification' }
  ];

  for (const a of attendanceToday) {
    insertAttendance.run(a.staff_id, today, a.status, a.in, a.out, a.method, a.dev, a.rem);
    if (a.status === 'Present' && a.method === 'Biometric Device') {
      insertBioLog.run(
        a.dev,
        a.staff_id,
        `${today} ${a.in}`,
        'CHECK_IN',
        'Fingerprint',
        99.4,
        JSON.stringify({ device: a.dev, staff: a.staff_id, score: 0.994, ip: '192.168.10.41' })
      );
    }
  }

  // 5. Seed Attendance History for previous 5 days (to populate trend charts)
  const pastDays = [
    { offset: 1, present: 16, absent: 3, pending: 1 },
    { offset: 2, present: 18, absent: 2, pending: 0 },
    { offset: 3, present: 17, absent: 2, pending: 1 },
    { offset: 4, present: 15, absent: 4, pending: 1 },
    { offset: 5, present: 19, absent: 1, pending: 0 }
  ];

  for (const pd of pastDays) {
    const d = new Date();
    d.setDate(d.getDate() - pd.offset);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    for (let i = 0; i < staffList.length; i++) {
      const staff = staffList[i];
      let status = 'Present';
      let checkIn = '08:45 AM';
      let checkOut = '05:15 PM';
      let method = 'Biometric Device';
      let dev = 'BIO-GATE-01';

      if (i >= pd.present && i < pd.present + pd.absent) {
        status = 'Absent';
        checkIn = null;
        checkOut = null;
        method = 'Pending';
        dev = null;
      } else if (i >= pd.present + pd.absent) {
        status = 'Not Checked In';
        checkIn = null;
        checkOut = null;
        method = 'Pending';
        dev = null;
      }

      try {
        insertAttendance.run(staff.id, dateStr, status, checkIn, checkOut, method, dev, 'Archived historical punch');
      } catch (e) {
        // ignore duplicate
      }
    }
  }

  // 6. Seed Events (Demonstrating Problem 2: Inter-College Event Resource Management)
  const insertEvent = db.prepare(`
    INSERT INTO events (
      event_name, event_date, event_time, event_type, participating_colleges,
      expected_students, expected_staff, expected_guests, total_participants,
      buffer_percentage, extra_chairs, total_chairs, estimated_tables, required_volunteers,
      venue, venue_capacity, additional_requirements, status, organizer_contact
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Formula validation:
  // Event 1: Example from problem statement!
  // 200 students, 20 staff, 30 guests => Total = 250. Buffer 10% = 25 chairs. Total chairs = 275.
  insertEvent.run(
    'State TechSymposium 2026: Innovations in AI',
    getDateAhead(2),
    '09:30 AM - 04:30 PM',
    'Symposium & Tech Paper Presentation',
    'COEP Technological Univ, VJTI Mumbai, PICT Pune, Sardar Patel Inst of Tech',
    200, 20, 30, 250,
    10.0, 25, 275,
    14, 15,
    'Main College Auditorium', 800,
    '4 Wireless cordless mics, 2 collar mics, 1 podium with LED display, 3 water dispensers with paper cups, VIP bouquet on stage dais, power strips for presentation laptops.',
    'Approved',
    'Prof. K. R. Kulkarni (+91 94220 54101)'
  );

  // Event 2: Hackathon
  // 320 students, 30 staff, 15 guests => Total = 365. Buffer 10% = 36.5 -> 37 chairs. Total = 402 chairs.
  insertEvent.run(
    'HackCampus: 24-Hour Inter-College Hackathon',
    getDateAhead(6),
    '10:00 AM (24 Hours Duration)',
    'Hackathon & Coding Competition',
    'MIT World Peace Univ, Sinhgad College of Engg, Cummins College of Engg, Army Institute of Tech',
    320, 30, 15, 365,
    10.0, 37, 402,
    45, 22,
    'Central IT Lab Complex & Seminar Hall A', 500,
    'Dedicated high-capacity gigabit LAN cables, 60 multi-plug extension power boards, 6 water bubble top dispensers, snack counter tables in lobby, 3 overnight security guards.',
    'Planning',
    'Dr. S. M. Deshpande (+91 98901 23450)'
  );

  // Event 3: Cultural Fest 'Sanskriti 2026'
  // 550 students, 40 staff, 60 guests => Total = 650. Buffer 10% = 65. Total chairs = 715.
  insertEvent.run(
    'Sanskriti 2026: Inter-College Cultural Gala',
    getDateAhead(12),
    '05:00 PM - 10:00 PM',
    'Cultural Fest & Performing Arts',
    'Fergusson College, Symbiosis International, Modern College, BMCC Commerce College',
    550, 40, 60, 650,
    10.0, 65, 715,
    20, 35,
    'Open Air Amphitheatre', 1500,
    'Stage lighting truss, 10 stage spot lights, green room partition screens, 2 heavy-duty generators for audio amplifiers, crowd control barricades for front stage.',
    'Planning',
    'Cultural Coordinator Sneha K. (+91 97654 32109)'
  );

  // Event 4: Sports Meet
  // 180 students, 15 staff, 10 guests => Total = 205. Buffer 10% = 21. Total chairs = 226.
  insertEvent.run(
    'Inter-Collegiate Badminton & Table Tennis Tournament',
    getDateAhead(18),
    '08:30 AM - 06:00 PM',
    'Sports Meet',
    'DY Patil College, JSPM Imperial, Indira College of Engg',
    180, 15, 10, 205,
    10.0, 21, 226,
    12, 12,
    'Indoor Sports Complex & Gymnasium', 400,
    'Umpire elevated chairs (4 units), scoreboard display tables, first-aid medical desk with stretcher, water cooling cans, changing room cleaning schedules.',
    'Planning',
    'Sports Director Major S. K. Bhosle (+91 94231 99882)'
  );

  // 7. Seed Maintenance Tasks / Work Orders
  const insertTask = db.prepare(`
    INSERT INTO maintenance_tasks (title, event_id, category, assigned_to, priority, status, due_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertTask.run(
    'Arrange 275 cushioned chairs in Main Auditorium for TechSymposium',
    1,
    'Seating',
    'Mahesh Kadam (Carpentry)',
    'High',
    'In Progress',
    getDateAhead(1),
    '250 for participants + 25 extra buffer chairs placed on side aisles.'
  );

  insertTask.run(
    'Setup 14 tables (4 registration, 2 dais, 4 VIP guest, 4 refreshments) in Auditorium Foyer',
    1,
    'Seating',
    'Sunil Solanki (Housekeeping)',
    'High',
    'Pending',
    getDateAhead(1),
    'Cover with navy blue table cloths and college crest skirts.'
  );

  insertTask.run(
    'Inspect Audio/Visual: 4 wireless cordless mics + podium LED screen in Main Auditorium',
    1,
    'Audio/Visual',
    'Dinesh Joshi (AV Tech)',
    'High',
    'In Progress',
    getDateAhead(1),
    'Recharge mic batteries and test HDMI switcher.'
  );

  insertTask.run(
    'Deploy 3 water dispensers with paper cup holders in Auditorium wings',
    1,
    'Housekeeping',
    'Santosh Patil (Plumbing)',
    'Medium',
    'Pending',
    getDateAhead(1),
    'Check water cooling compressor and replenish bottled cans.'
  );

  insertTask.run(
    'Calibrate Biometric Scanner #2 (Admin Block Foyer) optical glass sensor',
    null,
    'Electrical',
    'Anil Shinde (Electrical)',
    'Medium',
    'Completed',
    getTodayString(),
    'Cleaned optical prism surface and verified TCP/IP connectivity with server.'
  );

  console.log('Database seeded successfully with realistic campus maintenance records!');
}

function getDateAhead(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Initialize on module load
initDatabase();

module.exports = {
  db,
  getTodayString,
  getDateAhead
};
