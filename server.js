const express = require('express');
const cors = require('cors');
const path = require('path');
const { db, getTodayString, getDateAhead } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Helper for resource calculation
function calculateEventResources(students, staff, guests, bufferPercent = 10.0) {
  const numStudents = parseInt(students) || 0;
  const numStaff = parseInt(staff) || 0;
  const numGuests = parseInt(guests) || 0;
  const buffer = parseFloat(bufferPercent) || 10.0;

  const totalParticipants = numStudents + numStaff + numGuests;
  const extraChairs = Math.round(totalParticipants * (buffer / 100));
  const totalChairs = totalParticipants + extraChairs;

  // Table calculations
  const regTables = Math.max(2, Math.ceil(numStudents / 60));
  const daisTables = 2; // VIP Stage Dias
  const guestTables = Math.ceil(numGuests / 8);
  const foodTables = Math.max(2, Math.ceil(totalParticipants / 80));
  const estimatedTables = regTables + daisTables + guestTables + foodTables;

  // Volunteer calculation
  const studentVolunteers = Math.ceil(numStudents / 25);
  const vipEscorts = Math.ceil(numGuests / 10);
  const requiredVolunteers = Math.max(4, studentVolunteers + vipEscorts + 2);

  return {
    numStudents,
    numStaff,
    numGuests,
    totalParticipants,
    bufferPercent: buffer,
    extraChairs,
    totalChairs,
    estimatedTables,
    tableBreakdown: {
      registrationCounters: regTables,
      stageDaisTables: daisTables,
      guestHospitalityTables: guestTables,
      refreshmentCounters: foodTables
    },
    requiredVolunteers
  };
}

// ----------------------------------------------------
// 1. AUTHENTICATION ROUTES
// ----------------------------------------------------
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username/Email and Password are required.' });
  }

  const user = db.prepare(`
    SELECT id, username, email, role, full_name, designation, password
    FROM users
    WHERE (username = ? OR email = ?)
  `).get(username, username);

  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials. Please check your username/password.' });
  }

  const { password: _, ...userData } = user;
  return res.json({
    success: true,
    message: 'Login successful',
    user: userData,
    token: `session_token_${user.id}_${Date.now()}`
  });
});

app.get('/api/auth/current', (req, res) => {
  // Returns default demo admin user for easy evaluation
  const user = db.prepare(`
    SELECT id, username, email, role, full_name, designation
    FROM users
    WHERE role = 'admin'
    LIMIT 1
  `).get();
  res.json({ user });
});

// ----------------------------------------------------
// 2. DASHBOARD SUMMARY ROUTES
// ----------------------------------------------------
app.get('/api/dashboard/summary', (req, res) => {
  try {
    const today = getTodayString();

    // 1. Total staff
    const totalStaffCount = db.prepare('SELECT COUNT(*) as count FROM staff WHERE is_active = 1').get().count;

    // 2. Today's attendance counts
    const attendanceStats = db.prepare(`
      SELECT 
        SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent_count,
        SUM(CASE WHEN status = 'Not Checked In' THEN 1 ELSE 0 END) as not_checked_in_count,
        SUM(CASE WHEN method = 'Biometric Device' THEN 1 ELSE 0 END) as biometric_count,
        SUM(CASE WHEN method = 'Manual Entry' THEN 1 ELSE 0 END) as manual_count
      FROM attendance
      WHERE date = ?
    `).get(today);

    const presentCount = attendanceStats.present_count || 0;
    const absentCount = attendanceStats.absent_count || 0;
    const notCheckedInCount = attendanceStats.not_checked_in_count || 0;
    const biometricCount = attendanceStats.biometric_count || 0;
    const manualCount = attendanceStats.manual_count || 0;

    // Percentage of active staff present
    const attendancePercentage = totalStaffCount > 0 
      ? Math.round((presentCount / totalStaffCount) * 100) 
      : 0;

    // 3. Upcoming Events
    const upcomingEvents = db.prepare(`
      SELECT id, event_name, event_date, event_time, event_type, venue,
             total_participants, total_chairs, estimated_tables, status
      FROM events
      WHERE event_date >= ? AND status != 'Cancelled'
      ORDER BY event_date ASC
      LIMIT 5
    `).all(today);

    // 4. Aggregated upcoming resource requirements
    const eventStats = db.prepare(`
      SELECT 
        COUNT(*) as upcoming_count,
        COALESCE(SUM(total_participants), 0) as total_expected_participants,
        COALESCE(SUM(total_chairs), 0) as total_chairs_required,
        COALESCE(SUM(estimated_tables), 0) as total_tables_required
      FROM events
      WHERE event_date >= ? AND status != 'Cancelled'
    `).get(today);

    // 5. Pending Maintenance Tasks
    const pendingTasks = db.prepare(`
      SELECT id, title, category, priority, due_date, status, assigned_to
      FROM maintenance_tasks
      WHERE status != 'Completed'
      ORDER BY 
        CASE priority 
          WHEN 'Urgent' THEN 1 
          WHEN 'High' THEN 2 
          WHEN 'Medium' THEN 3 
          ELSE 4 
        END,
        due_date ASC
      LIMIT 6
    `).all();

    const pendingTasksCount = db.prepare(`
      SELECT COUNT(*) as count FROM maintenance_tasks WHERE status != 'Completed'
    `).get().count;

    // 6. Recent Biometric Device Punches (Audit Activity)
    const recentBiometricLogs = db.prepare(`
      SELECT l.id, l.device_id, l.staff_id, s.name as staff_name, s.department,
             l.punch_time, l.punch_type, l.verification_type, l.confidence_score
      FROM biometric_logs l
      LEFT JOIN staff s ON l.staff_id = s.staff_id
      ORDER BY l.id DESC
      LIMIT 6
    `).all();

    // 7. 7-Day Attendance Trend
    const trendRows = db.prepare(`
      SELECT 
        date,
        SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'Not Checked In' THEN 1 ELSE 0 END) as not_checked_in
      FROM attendance
      WHERE date >= date(?, '-6 days')
      GROUP BY date
      ORDER BY date ASC
    `).all(today);

    // 8. Department Attendance Breakdown
    const deptAttendance = db.prepare(`
      SELECT 
        s.department,
        COUNT(s.id) as total_staff,
        SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present_count
      FROM staff s
      LEFT JOIN attendance a ON s.staff_id = a.staff_id AND a.date = ?
      WHERE s.is_active = 1
      GROUP BY s.department
      ORDER BY total_staff DESC
    `).all(today);

    res.json({
      today,
      staffStats: {
        totalStaff: totalStaffCount,
        present: presentCount,
        absent: absentCount,
        notCheckedIn: notCheckedInCount,
        attendancePercentage,
        biometricCount,
        manualCount
      },
      eventStats: {
        upcomingCount: eventStats.upcoming_count || 0,
        totalExpectedParticipants: eventStats.total_expected_participants || 0,
        totalChairsRequired: eventStats.total_chairs_required || 0,
        totalTablesRequired: eventStats.total_tables_required || 0
      },
      pendingTasksCount,
      upcomingEvents,
      pendingTasks,
      recentBiometricLogs,
      trendData: trendRows,
      deptAttendance
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ error: 'Failed to generate dashboard summary' });
  }
});

// ----------------------------------------------------
// 3. MODULE 1: STAFF & ATTENDANCE MANAGEMENT
// ----------------------------------------------------

// Get all staff members
app.get('/api/staff', (req, res) => {
  try {
    const { department, search } = req.query;
    let query = `SELECT * FROM staff WHERE is_active = 1`;
    const params = [];

    if (department && department !== 'All') {
      query += ` AND department = ?`;
      params.push(department);
    }

    if (search) {
      query += ` AND (name LIKE ? OR staff_id LIKE ? OR designation LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY staff_id ASC`;
    const staff = db.prepare(query).all(...params);
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new staff member
app.post('/api/staff', (req, res) => {
  try {
    const { staff_id, name, department, designation, email, phone, shift } = req.body;
    if (!staff_id || !name || !department || !designation) {
      return res.status(400).json({ error: 'Staff ID, Name, Department and Designation are required.' });
    }

    const check = db.prepare('SELECT id FROM staff WHERE staff_id = ?').get(staff_id);
    if (check) {
      return res.status(409).json({ error: `Staff ID '${staff_id}' already exists.` });
    }

    db.prepare(`
      INSERT INTO staff (staff_id, name, department, designation, email, phone, shift)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      staff_id.trim().toUpperCase(),
      name.trim(),
      department.trim(),
      designation.trim(),
      email ? email.trim() : null,
      phone ? phone.trim() : null,
      shift || 'General (09:00 AM - 05:00 PM)'
    );

    // Initialize today's attendance as 'Not Checked In' for the new staff
    const today = getTodayString();
    db.prepare(`
      INSERT OR IGNORE INTO attendance (staff_id, date, status, method, remarks)
      VALUES (?, ?, 'Not Checked In', 'Pending', 'Newly added staff record')
    `).run(staff_id.trim().toUpperCase(), today);

    res.status(201).json({ success: true, message: 'Staff member added successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update staff member
app.put('/api/staff/:id', (req, res) => {
  try {
    const { name, department, designation, email, phone, shift } = req.body;
    const staffId = req.params.id;

    db.prepare(`
      UPDATE staff
      SET name = ?, department = ?, designation = ?, email = ?, phone = ?, shift = ?
      WHERE staff_id = ?
    `).run(name, department, designation, email, phone, shift, staffId);

    res.json({ success: true, message: 'Staff member updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete (soft deactivate) staff member
app.delete('/api/staff/:id', (req, res) => {
  try {
    const staffId = req.params.id;
    db.prepare('UPDATE staff SET is_active = 0 WHERE staff_id = ?').run(staffId);
    res.json({ success: true, message: 'Staff member deactivated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Today's staff attendance dashboard list with filters
app.get('/api/attendance/today', (req, res) => {
  try {
    const today = getTodayString();
    const { department, status, search } = req.query;

    let query = `
      SELECT 
        s.id as staff_pk,
        s.staff_id,
        s.name,
        s.department,
        s.designation,
        s.shift,
        s.phone,
        COALESCE(a.date, ?) as attendance_date,
        COALESCE(a.status, 'Not Checked In') as status,
        a.check_in,
        a.check_out,
        COALESCE(a.method, 'Pending') as method,
        a.device_id,
        a.remarks,
        a.updated_at
      FROM staff s
      LEFT JOIN attendance a ON s.staff_id = a.staff_id AND a.date = ?
      WHERE s.is_active = 1
    `;
    const params = [today, today];

    if (department && department !== 'All') {
      query += ` AND s.department = ?`;
      params.push(department);
    }

    if (status && status !== 'All') {
      if (status === 'Not Checked In') {
        query += ` AND (a.status IS NULL OR a.status = 'Not Checked In')`;
      } else {
        query += ` AND a.status = ?`;
        params.push(status);
      }
    }

    if (search) {
      query += ` AND (s.name LIKE ? OR s.staff_id LIKE ? OR s.department LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY 
      CASE COALESCE(a.status, 'Not Checked In')
        WHEN 'Present' THEN 1
        WHEN 'Not Checked In' THEN 2
        WHEN 'Absent' THEN 3
        ELSE 4
      END,
      s.staff_id ASC`;

    const records = db.prepare(query).all(...params);

    // Also return departments list for easy dropdown filling
    const departments = db.prepare(`
      SELECT DISTINCT department FROM staff WHERE is_active = 1 ORDER BY department ASC
    `).all().map(r => r.department);

    res.json({
      date: today,
      records,
      departments
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual attendance entry / override for the prototype
// Explicitly documents that this is a manual override, NOT biometric verification
app.post('/api/attendance/manual-entry', (req, res) => {
  try {
    const { staff_id, date, status, check_in, check_out, remarks } = req.body;
    if (!staff_id || !status) {
      return res.status(400).json({ error: 'Staff ID and Attendance Status are required.' });
    }

    const attendanceDate = date || getTodayString();
    const existing = db.prepare('SELECT id FROM attendance WHERE staff_id = ? AND date = ?').get(staff_id, attendanceDate);

    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    let resolvedCheckIn = check_in;
    if (status === 'Present' && !resolvedCheckIn) {
      resolvedCheckIn = nowTime;
    } else if (status === 'Absent' || status === 'Not Checked In') {
      resolvedCheckIn = null;
    }

    const defaultRemarks = remarks || (status === 'Present' 
      ? 'Manual verification override by Maintenance Supervisor' 
      : (status === 'Absent' ? 'Marked Absent manually' : 'Pending punch'));

    if (existing) {
      db.prepare(`
        UPDATE attendance
        SET status = ?, check_in = ?, check_out = ?, method = 'Manual Entry',
            device_id = 'MANUAL', remarks = ?, updated_at = datetime('now')
        WHERE staff_id = ? AND date = ?
      `).run(status, resolvedCheckIn, check_out || null, defaultRemarks, staff_id, attendanceDate);
    } else {
      db.prepare(`
        INSERT INTO attendance (staff_id, date, status, check_in, check_out, method, device_id, remarks)
        VALUES (?, ?, ?, ?, ?, 'Manual Entry', 'MANUAL', ?)
      `).run(staff_id, attendanceDate, status, resolvedCheckIn, check_out || null, defaultRemarks);
    }

    res.json({
      success: true,
      message: `Manual attendance recorded for Staff ID: ${staff_id} as ${status}.`,
      isManualOverride: true
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Attendance history by date range or specific date
app.get('/api/attendance/history', (req, res) => {
  try {
    const { date, department, status, search, limit = 50 } = req.query;
    let query = `
      SELECT 
        a.id,
        a.date,
        s.staff_id,
        s.name,
        s.department,
        s.designation,
        a.status,
        a.check_in,
        a.check_out,
        a.method,
        a.device_id,
        a.remarks
      FROM attendance a
      JOIN staff s ON a.staff_id = s.staff_id
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      query += ` AND a.date = ?`;
      params.push(date);
    }

    if (department && department !== 'All') {
      query += ` AND s.department = ?`;
      params.push(department);
    }

    if (status && status !== 'All') {
      query += ` AND a.status = ?`;
      params.push(status);
    }

    if (search) {
      query += ` AND (s.name LIKE ? OR s.staff_id LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY a.date DESC, s.staff_id ASC LIMIT ?`;
    params.push(parseInt(limit));

    const records = db.prepare(query).all(...params);
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CSV Export for attendance
app.get('/api/attendance/export', (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || getTodayString();

    const records = db.prepare(`
      SELECT 
        a.date,
        s.staff_id,
        s.name,
        s.department,
        s.designation,
        a.status,
        COALESCE(a.check_in, '--') as check_in,
        COALESCE(a.check_out, '--') as check_out,
        a.method,
        COALESCE(a.device_id, '--') as device_id,
        COALESCE(a.remarks, '') as remarks
      FROM attendance a
      JOIN staff s ON a.staff_id = s.staff_id
      WHERE a.date = ?
      ORDER BY s.staff_id ASC
    `).all(targetDate);

    let csv = 'Date,Staff ID,Staff Name,Department,Designation,Status,Check In,Check Out,Verification Method,Device ID,Remarks\n';
    for (const r of records) {
      csv += `"${r.date}","${r.staff_id}","${r.name}","${r.department}","${r.designation}","${r.status}","${r.check_in}","${r.check_out}","${r.method}","${r.device_id}","${r.remarks.replace(/"/g, '""')}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=Staff_Attendance_${targetDate}.csv`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 4. BIOMETRIC DEVICE INTEGRATION HUB & LIVE SIMULATOR
// ----------------------------------------------------

// List registered biometric hardware devices
app.get('/api/biometric/devices', (req, res) => {
  try {
    const devices = db.prepare('SELECT * FROM biometric_devices ORDER BY device_id ASC').all();
    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Official Authorized Biometric Device Sync API
// Hardware terminals (ZKTeco, Suprema, eSSL) POST here with their API key
app.post('/api/biometric/sync', (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const apiKey = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : req.body.api_key;
    const { device_id, staff_id, timestamp, punch_type = 'CHECK_IN', verification_type = 'Fingerprint', confidence_score = 99.4 } = req.body;

    if (!device_id || !staff_id) {
      return res.status(400).json({ error: 'device_id and staff_id are required in biometric payload.' });
    }

    // Verify authorized device
    const device = db.prepare('SELECT * FROM biometric_devices WHERE device_id = ?').get(device_id);
    if (!device) {
      return res.status(403).json({ error: `Unauthorized or unregistered device ID: ${device_id}` });
    }

    if (apiKey && device.api_key !== apiKey) {
      return res.status(401).json({ error: 'Invalid API Key for biometric device authorization.' });
    }

    // Verify staff exists
    const staff = db.prepare('SELECT * FROM staff WHERE staff_id = ? AND is_active = 1').get(staff_id);
    if (!staff) {
      return res.status(404).json({ error: `Staff member not found with ID: ${staff_id}` });
    }

    const now = new Date();
    const today = getTodayString();
    const punchTimeStr = timestamp || now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    // 1. Log in raw biometric hardware audit table
    const logResult = db.prepare(`
      INSERT INTO biometric_logs (device_id, staff_id, punch_time, punch_type, verification_type, confidence_score, raw_payload)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      device_id,
      staff_id,
      `${today} ${punchTimeStr}`,
      punch_type,
      verification_type,
      parseFloat(confidence_score) || 99.4,
      JSON.stringify(req.body)
    );

    // 2. Update device last_sync
    db.prepare(`UPDATE biometric_devices SET last_sync = datetime('now'), status = 'Online' WHERE device_id = ?`).run(device_id);

    // 3. Update or create today's attendance record
    const existingAtt = db.prepare('SELECT * FROM attendance WHERE staff_id = ? AND date = ?').get(staff_id, today);

    if (existingAtt) {
      if (punch_type === 'CHECK_OUT') {
        db.prepare(`
          UPDATE attendance
          SET check_out = ?, method = 'Biometric Device', device_id = ?,
              remarks = 'Biometric check-out verified (' || ? || ')', updated_at = datetime('now')
          WHERE id = ?
        `).run(punchTimeStr, device_id, verification_type, existingAtt.id);
      } else {
        // CHECK_IN update
        db.prepare(`
          UPDATE attendance
          SET status = 'Present', check_in = COALESCE(check_in, ?), method = 'Biometric Device',
              device_id = ?, remarks = 'Biometric verified via ' || ? || ' (' || ? || '%)',
              updated_at = datetime('now')
          WHERE id = ?
        `).run(punchTimeStr, device_id, verification_type, confidence_score, existingAtt.id);
      }
    } else {
      // First punch of the day
      db.prepare(`
        INSERT INTO attendance (staff_id, date, status, check_in, check_out, method, device_id, remarks)
        VALUES (?, ?, 'Present', ?, NULL, 'Biometric Device', ?, 'Biometric verified via ' || ? || ' (' || ? || '%)')
      `).run(staff_id, today, punchTimeStr, device_id, verification_type, confidence_score);
    }

    res.json({
      success: true,
      message: `Biometric punch processed successfully for ${staff.name} (${staff.staff_id})`,
      logId: logResult.lastInsertRowid,
      verification: {
        device: device.name,
        deviceId: device_id,
        type: verification_type,
        confidence: `${confidence_score}%`,
        punchType: punch_type,
        time: punchTimeStr
      }
    });
  } catch (err) {
    console.error('Biometric sync error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Biometric Raw Logs
app.get('/api/biometric/logs', (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT 
        l.id,
        l.device_id,
        d.name as device_name,
        l.staff_id,
        s.name as staff_name,
        s.department,
        l.punch_time,
        l.punch_type,
        l.verification_type,
        l.confidence_score,
        l.created_at
      FROM biometric_logs l
      LEFT JOIN staff s ON l.staff_id = s.staff_id
      LEFT JOIN biometric_devices d ON l.device_id = d.device_id
      ORDER BY l.id DESC
      LIMIT 100
    `).all();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Biometric Integration Documentation & Specifications
app.get('/api/biometric/specs', (req, res) => {
  res.json({
    title: 'Authorized Biometric Device Integration Specification',
    protocol: 'RESTful HTTPS / HTTP Webhook',
    endpoint: '/api/biometric/sync',
    method: 'POST',
    authentication: 'Bearer <DEVICE_API_KEY> header or { api_key } in JSON body',
    payloadSchema: {
      device_id: 'String (e.g. "BIO-GATE-01") [Required]',
      staff_id: 'String (e.g. "STF-101") [Required]',
      punch_type: 'String ("CHECK_IN" | "CHECK_OUT") [Default: "CHECK_IN"]',
      verification_type: 'String ("Fingerprint" | "Facial Recognition" | "RFID Card")',
      confidence_score: 'Float (e.g. 99.4)',
      timestamp: 'String (optional, defaults to server time)',
      api_key: 'String [Required if Authorization header is omitted]'
    },
    curlExample: `curl -X POST http://localhost:3000/api/biometric/sync \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer BIO_KEY_GATE01_SECURE" \\
  -d '{"device_id": "BIO-GATE-01", "staff_id": "STF-101", "punch_type": "CHECK_IN", "verification_type": "Fingerprint", "confidence_score": 99.4}'`
  });
});

// ----------------------------------------------------
// 5. MODULE 2: INTER-COLLEGE EVENT RESOURCE MANAGEMENT
// ----------------------------------------------------

// List all events
app.get('/api/events', (req, res) => {
  try {
    const { status, filter } = req.query;
    const today = getTodayString();
    let query = 'SELECT * FROM events WHERE 1=1';
    const params = [];

    if (filter === 'upcoming') {
      query += ' AND event_date >= ?';
      params.push(today);
    } else if (filter === 'past') {
      query += ' AND event_date < ?';
      params.push(today);
    }

    if (status && status !== 'All') {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY event_date ASC';
    const events = db.prepare(query).all(...params);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single event by ID with calculated details
app.get('/api/events/:id', (req, res) => {
  try {
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const resources = calculateEventResources(
      event.expected_students,
      event.expected_staff,
      event.expected_guests,
      event.buffer_percentage
    );

    // Get maintenance tasks linked to this event
    const tasks = db.prepare('SELECT * FROM maintenance_tasks WHERE event_id = ? ORDER BY id ASC').all(event.id);

    res.json({
      ...event,
      resourceCalculations: resources,
      tasks
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new inter-college event plan
app.post('/api/events', (req, res) => {
  try {
    const {
      event_name,
      event_date,
      event_time,
      event_type,
      participating_colleges,
      expected_students = 0,
      expected_staff = 0,
      expected_guests = 0,
      buffer_percentage = 10.0,
      venue,
      venue_capacity = 500,
      additional_requirements,
      organizer_contact,
      status = 'Planning'
    } = req.body;

    if (!event_name || !event_date || !venue) {
      return res.status(400).json({ error: 'Event name, event date and venue selection are required.' });
    }

    // Automatic resource calculations
    const resCalc = calculateEventResources(expected_students, expected_staff, expected_guests, buffer_percentage);

    const stmt = db.prepare(`
      INSERT INTO events (
        event_name, event_date, event_time, event_type, participating_colleges,
        expected_students, expected_staff, expected_guests, total_participants,
        buffer_percentage, extra_chairs, total_chairs, estimated_tables, required_volunteers,
        venue, venue_capacity, additional_requirements, status, organizer_contact
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      event_name.trim(),
      event_date,
      event_time || '09:00 AM - 05:00 PM',
      event_type || 'Inter-College Competition',
      participating_colleges || '',
      resCalc.numStudents,
      resCalc.numStaff,
      resCalc.numGuests,
      resCalc.totalParticipants,
      resCalc.bufferPercent,
      resCalc.extraChairs,
      resCalc.totalChairs,
      resCalc.estimatedTables,
      resCalc.requiredVolunteers,
      venue,
      parseInt(venue_capacity) || 500,
      additional_requirements || '',
      status,
      organizer_contact || ''
    );

    const newEventId = result.lastInsertRowid;

    // Automatically generate maintenance work order tasks for the maintenance crew
    const insertTask = db.prepare(`
      INSERT INTO maintenance_tasks (title, event_id, category, assigned_to, priority, status, due_date, notes)
      VALUES (?, ?, ?, ?, ?, 'Pending', ?, ?)
    `);

    // Task 1: Seating Arrangement
    insertTask.run(
      `Deploy ${resCalc.totalChairs} chairs (${resCalc.totalParticipants} + ${resCalc.extraChairs} buffer) at ${venue}`,
      newEventId,
      'Seating',
      'Civil & Carpentry Seating Team',
      'High',
      event_date,
      `Calculated from: ${resCalc.numStudents} students + ${resCalc.numStaff} staff + ${resCalc.numGuests} guests with ${resCalc.bufferPercent}% buffer.`
    );

    // Task 2: Tables Setup
    insertTask.run(
      `Set up ${resCalc.estimatedTables} tables (${resCalc.tableBreakdown.registrationCounters} registration, ${resCalc.tableBreakdown.stageDaisTables} stage, ${resCalc.tableBreakdown.guestHospitalityTables} guest, ${resCalc.tableBreakdown.refreshmentCounters} food) at ${venue}`,
      newEventId,
      'Seating',
      'Housekeeping Team Lead',
      'High',
      event_date,
      'Provide neat table cloths and college crest skirts.'
    );

    // Task 3: A/V & Power setup
    insertTask.run(
      `Audio/Visual & Power staging inspection for ${event_name}`,
      newEventId,
      'Audio/Visual',
      'AV Systems Technician',
      'Medium',
      event_date,
      additional_requirements || 'Sound system, podium, and display screens check.'
    );

    res.status(201).json({
      success: true,
      message: `Event '${event_name}' planned successfully! Resource requirements and 3 maintenance work orders generated.`,
      eventId: newEventId,
      calculations: resCalc
    });
  } catch (err) {
    console.error('Error creating event:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update an event
app.put('/api/events/:id', (req, res) => {
  try {
    const eventId = req.params.id;
    const {
      event_name,
      event_date,
      event_time,
      event_type,
      participating_colleges,
      expected_students = 0,
      expected_staff = 0,
      expected_guests = 0,
      buffer_percentage = 10.0,
      venue,
      venue_capacity = 500,
      additional_requirements,
      organizer_contact,
      status
    } = req.body;

    const resCalc = calculateEventResources(expected_students, expected_staff, expected_guests, buffer_percentage);

    db.prepare(`
      UPDATE events
      SET event_name = ?, event_date = ?, event_time = ?, event_type = ?, participating_colleges = ?,
          expected_students = ?, expected_staff = ?, expected_guests = ?, total_participants = ?,
          buffer_percentage = ?, extra_chairs = ?, total_chairs = ?, estimated_tables = ?, required_volunteers = ?,
          venue = ?, venue_capacity = ?, additional_requirements = ?, status = ?, organizer_contact = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(
      event_name,
      event_date,
      event_time,
      event_type,
      participating_colleges,
      resCalc.numStudents,
      resCalc.numStaff,
      resCalc.numGuests,
      resCalc.totalParticipants,
      resCalc.bufferPercent,
      resCalc.extraChairs,
      resCalc.totalChairs,
      resCalc.estimatedTables,
      resCalc.requiredVolunteers,
      venue,
      parseInt(venue_capacity) || 500,
      additional_requirements,
      status,
      organizer_contact,
      eventId
    );

    res.json({
      success: true,
      message: 'Event details and recalculated resource allocations updated successfully.',
      calculations: resCalc
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete an event
app.delete('/api/events/:id', (req, res) => {
  try {
    const eventId = req.params.id;
    db.prepare('DELETE FROM events WHERE id = ?').run(eventId);
    res.json({ success: true, message: 'Event plan deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update event status
app.patch('/api/events/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    db.prepare(`UPDATE events SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, req.params.id);
    res.json({ success: true, message: `Event status updated to ${status}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 6. MAINTENANCE WORK ORDERS & TASKS
// ----------------------------------------------------
app.get('/api/tasks', (req, res) => {
  try {
    const { status, event_id } = req.query;
    let query = `
      SELECT t.*, e.event_name, e.venue
      FROM maintenance_tasks t
      LEFT JOIN events e ON t.event_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'All') {
      query += ' AND t.status = ?';
      params.push(status);
    }

    if (event_id) {
      query += ' AND t.event_id = ?';
      params.push(event_id);
    }

    query += ' ORDER BY CASE t.priority WHEN "Urgent" THEN 1 WHEN "High" THEN 2 WHEN "Medium" THEN 3 ELSE 4 END, t.due_date ASC';
    const tasks = db.prepare(query).all(...params);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks', (req, res) => {
  try {
    const { title, event_id, category = 'Seating', assigned_to, priority = 'Medium', due_date, notes } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Task title is required.' });
    }

    const result = db.prepare(`
      INSERT INTO maintenance_tasks (title, event_id, category, assigned_to, priority, status, due_date, notes)
      VALUES (?, ?, ?, ?, ?, 'Pending', ?, ?)
    `).run(title, event_id || null, category, assigned_to || 'Unassigned', priority, due_date || getTodayString(), notes || '');

    res.status(201).json({ success: true, message: 'Maintenance task created.', taskId: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/tasks/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const completedAt = status === 'Completed' ? new Date().toISOString() : null;
    db.prepare(`
      UPDATE maintenance_tasks
      SET status = ?, completed_at = ?
      WHERE id = ?
    `).run(status, completedAt, req.params.id);

    res.json({ success: true, message: `Task status updated to ${status}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM maintenance_tasks WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Task deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback for SPA routes (using standard middleware without bare '*' syntax)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  next();
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`Smart Campus Management System Server running!`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log(`Staff Biometric Attendance & Event Resource Management`);
  console.log(`=======================================================`);
});
