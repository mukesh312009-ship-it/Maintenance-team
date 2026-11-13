/**
 * Smart Campus Management System - API Client Layer
 * Dual-Mode: Communicates with Express + SQLite Backend,
 * with automatic fallback to persistent LocalStorage store for static hosting / demo links.
 */

const MockStore = {
  initialized: false,

  init() {
    if (this.initialized) return;
    if (!localStorage.getItem('scms_staff')) {
      // Seed Staff
      const staff = [
        { id: 1, staff_id: 'STF-101', name: 'Rajesh Kumar Verma', department: 'Maintenance & Housekeeping', designation: 'Head Maintenance Foreman', shift: 'Morning (07:30 AM - 03:30 PM)', phone: '+91 98230 11201' },
        { id: 2, staff_id: 'STF-102', name: 'Anil Gangadhar Shinde', department: 'Electrical & HVAC', designation: 'Senior Campus Electrician', shift: 'General (09:00 AM - 05:00 PM)', phone: '+91 98230 11202' },
        { id: 3, staff_id: 'STF-103', name: 'Mahesh Babanrao Kadam', department: 'Civil & Carpentry', designation: 'Master Carpenter & Seating Lead', shift: 'Morning (07:30 AM - 03:30 PM)', phone: '+91 98230 11203' },
        { id: 4, staff_id: 'STF-104', name: 'Pooja Nitin Deshpande', department: 'Administrative Office', designation: 'Records Officer', shift: 'General (09:00 AM - 05:00 PM)', phone: '+91 98230 11204' },
        { id: 5, staff_id: 'STF-105', name: 'Sanjay Tukaram Jadhav', department: 'Maintenance & Housekeeping', designation: 'Housekeeping Coordinator', shift: 'Morning (07:30 AM - 03:30 PM)', phone: '+91 98230 11205' },
        { id: 6, staff_id: 'STF-106', name: 'Dinesh Chandra Joshi', department: 'IT Infrastructure & Audio/Visual', designation: 'AV Systems Technician', shift: 'General (09:00 AM - 05:00 PM)', phone: '+91 98230 11206' },
        { id: 7, staff_id: 'STF-107', name: 'Kavita Sundaram Iyer', department: 'Computer Science & Engg', designation: 'Lab Administrator', shift: 'General (09:00 AM - 05:00 PM)', phone: '+91 98230 11207' },
        { id: 8, staff_id: 'STF-108', name: 'Vikram Singh Rathore', department: 'Campus Security', designation: 'Security Supervisor', shift: 'Morning (06:00 AM - 02:00 PM)', phone: '+91 98230 11208' },
        { id: 9, staff_id: 'STF-109', name: 'Manoj Prabhakar More', department: 'Electrical & HVAC', designation: 'AC Plant Operator', shift: 'General (09:00 AM - 05:00 PM)', phone: '+91 98230 11209' },
        { id: 10, staff_id: 'STF-110', name: 'Santosh Narayan Patil', department: 'Civil & Carpentry', designation: 'Plumbing & Water Supply Incharge', shift: 'Morning (07:30 AM - 03:30 PM)', phone: '+91 98230 11210' },
        { id: 11, staff_id: 'STF-111', name: 'Sunil Jagdish Solanki', department: 'Maintenance & Housekeeping', designation: 'Hall Setup Technician', shift: 'Morning (07:30 AM - 03:30 PM)', phone: '+91 98230 11211' },
        { id: 12, staff_id: 'STF-112', name: 'Geeta Mohan Kulkarni', department: 'Administrative Office', designation: 'Event Logistics Assistant', shift: 'General (09:00 AM - 05:00 PM)', phone: '+91 98230 11212' },
        { id: 13, staff_id: 'STF-113', name: 'Praveen Kumar Nair', department: 'IT Infrastructure & Audio/Visual', designation: 'Network & Smart Classroom Engg', shift: 'General (09:00 AM - 05:00 PM)', phone: '+91 98230 11213' },
        { id: 14, staff_id: 'STF-114', name: 'Ajay Vasant Gaikwad', department: 'Maintenance & Housekeeping', designation: 'Sanitation Inspector', shift: 'Morning (07:30 AM - 03:30 PM)', phone: '+91 98230 11214' },
        { id: 15, staff_id: 'STF-115', name: 'Neeta Rakesh Saxena', department: 'Administrative Office', designation: 'Accounts & Vendor Clerk', shift: 'General (09:00 AM - 05:00 PM)', phone: '+91 98230 11215' },
        { id: 16, staff_id: 'STF-116', name: 'Ganesh Pandurang Salve', department: 'Civil & Carpentry', designation: 'Stage & Furniture Fabricator', shift: 'Morning (07:30 AM - 03:30 PM)', phone: '+91 98230 11216' },
        { id: 17, staff_id: 'STF-117', name: 'Deepak Harishchandra Rao', department: 'Electrical & HVAC', designation: 'Backup Generator Technician', shift: 'General (09:00 AM - 05:00 PM)', phone: '+91 98230 11217' },
        { id: 18, staff_id: 'STF-118', name: 'Priyanka Ashok Shinde', department: 'Computer Science & Engg', designation: 'Technical Assistant', shift: 'General (09:00 AM - 05:00 PM)', phone: '+91 98230 11218' },
        { id: 19, staff_id: 'STF-119', name: 'Bhimrao S. Waghmare', department: 'Maintenance & Housekeeping', designation: 'Grounds & Landscaping Staff', shift: 'Morning (07:00 AM - 03:00 PM)', phone: '+91 98230 11219' },
        { id: 20, staff_id: 'STF-120', name: 'Arun Devidas Mane', department: 'Campus Security', designation: 'Main Gate Control Guard', shift: 'Morning (06:00 AM - 02:00 PM)', phone: '+91 98230 11220' }
      ];
      localStorage.setItem('scms_staff', JSON.stringify(staff));

      // Seed Today's Attendance
      const today = new Date().toISOString().split('T')[0];
      const attendance = [
        { staff_id: 'STF-101', date: today, status: 'Present', check_in: '07:28 AM', check_out: null, method: 'Biometric Device', device_id: 'BIO-MAINT-03', remarks: 'Normal on-time entry' },
        { staff_id: 'STF-102', date: today, status: 'Present', check_in: '08:52 AM', check_out: null, method: 'Biometric Device', device_id: 'BIO-GATE-01', remarks: 'Normal on-time entry' },
        { staff_id: 'STF-103', date: today, status: 'Present', check_in: '07:35 AM', check_out: null, method: 'Biometric Device', device_id: 'BIO-MAINT-03', remarks: 'Fingerprint verified (99.1%)' },
        { staff_id: 'STF-104', date: today, status: 'Present', check_in: '08:59 AM', check_out: null, method: 'Biometric Device', device_id: 'BIO-ADMIN-02', remarks: 'Normal on-time entry' },
        { staff_id: 'STF-105', date: today, status: 'Present', check_in: '07:40 AM', check_out: null, method: 'Manual Entry', device_id: 'MANUAL', remarks: 'Sensor thumb scan failed; manual verification by Supervisor Patil' },
        { staff_id: 'STF-106', date: today, status: 'Present', check_in: '09:05 AM', check_out: null, method: 'Biometric Device', device_id: 'BIO-ADMIN-02', remarks: 'Face scan verified' },
        { staff_id: 'STF-107', date: today, status: 'Present', check_in: '09:12 AM', check_out: null, method: 'Biometric Device', device_id: 'BIO-GATE-01', remarks: 'Late check-in recorded' },
        { staff_id: 'STF-108', date: today, status: 'Present', check_in: '05:58 AM', check_out: null, method: 'Biometric Device', device_id: 'BIO-GATE-01', remarks: 'Morning security shift' },
        { staff_id: 'STF-109', date: today, status: 'Present', check_in: '08:48 AM', check_out: null, method: 'Biometric Device', device_id: 'BIO-MAINT-03', remarks: 'Normal on-time entry' },
        { staff_id: 'STF-110', date: today, status: 'Present', check_in: '07:42 AM', check_out: null, method: 'Manual Entry', device_id: 'MANUAL', remarks: 'Forgot RFID card, verified manually by HOD' },
        { staff_id: 'STF-111', date: today, status: 'Present', check_in: '07:31 AM', check_out: null, method: 'Biometric Device', device_id: 'BIO-AUDI-04', remarks: 'Setup duty at Auditorium' },
        { staff_id: 'STF-112', date: today, status: 'Absent', check_in: null, check_out: null, method: 'Pending', device_id: null, remarks: 'Medical Leave approved (Fever)' },
        { staff_id: 'STF-113', date: today, status: 'Absent', check_in: null, check_out: null, method: 'Pending', device_id: null, remarks: 'Official On-Duty visit to Central University' },
        { staff_id: 'STF-114', date: today, status: 'Absent', check_in: null, check_out: null, method: 'Pending', device_id: null, remarks: 'Casual Leave sanctioned' },
        { staff_id: 'STF-115', date: today, status: 'Absent', check_in: null, check_out: null, method: 'Pending', device_id: null, remarks: 'Uninformed absence - Alert sent to HOD' },
        { staff_id: 'STF-116', date: today, status: 'Not Checked In', check_in: null, check_out: null, method: 'Pending', device_id: null, remarks: 'Shift started at 07:30 AM - Biometric punch missing' },
        { staff_id: 'STF-117', date: today, status: 'Not Checked In', check_in: null, check_out: null, method: 'Pending', device_id: null, remarks: 'Pending verification' },
        { staff_id: 'STF-118', date: today, status: 'Not Checked In', check_in: null, check_out: null, method: 'Pending', device_id: null, remarks: 'Pending verification' },
        { staff_id: 'STF-119', date: today, status: 'Not Checked In', check_in: null, check_out: null, method: 'Pending', device_id: null, remarks: 'Field duty without punch' },
        { staff_id: 'STF-120', date: today, status: 'Not Checked In', check_in: null, check_out: null, method: 'Pending', device_id: null, remarks: 'Pending verification' }
      ];
      localStorage.setItem('scms_attendance', JSON.stringify(attendance));

      // Seed Events (including Problem 2 exact example: 200 + 20 + 30 = 250 -> 10% = 25 -> 275 chairs)
      const events = [
        {
          id: 1,
          event_name: 'State TechSymposium 2026: Innovations in AI',
          event_date: '2026-11-20',
          event_time: '09:30 AM - 04:30 PM',
          event_type: 'Symposium & Tech Paper Presentation',
          participating_colleges: 'COEP Technological Univ, VJTI Mumbai, PICT Pune, Sardar Patel Inst of Tech',
          expected_students: 200,
          expected_staff: 20,
          expected_guests: 30,
          total_participants: 250,
          buffer_percentage: 10.0,
          extra_chairs: 25,
          total_chairs: 275,
          estimated_tables: 14,
          required_volunteers: 15,
          venue: 'Main College Auditorium',
          venue_capacity: 800,
          additional_requirements: '4 Wireless cordless mics, 2 collar mics, 1 podium with LED display, 3 water dispensers, VIP bouquet on dais.',
          status: 'Approved',
          organizer_contact: 'Prof. K. R. Kulkarni (+91 94220 54101)'
        },
        {
          id: 2,
          event_name: 'HackCampus: 24-Hour Inter-College Hackathon',
          event_date: '2026-11-25',
          event_time: '10:00 AM (24 Hours Duration)',
          event_type: 'Hackathon & Coding Competition',
          participating_colleges: 'MIT World Peace Univ, Sinhgad College of Engg, Cummins College of Engg',
          expected_students: 320,
          expected_staff: 30,
          expected_guests: 15,
          total_participants: 365,
          buffer_percentage: 10.0,
          extra_chairs: 37,
          total_chairs: 402,
          estimated_tables: 45,
          required_volunteers: 22,
          venue: 'Central IT Lab Complex & Seminar Hall A',
          venue_capacity: 500,
          additional_requirements: '60 multi-plug extension boards, 6 water bubble tops, snack counter tables in lobby.',
          status: 'Planning',
          organizer_contact: 'Dr. S. M. Deshpande (+91 98901 23450)'
        },
        {
          id: 3,
          event_name: 'Sanskriti 2026: Inter-College Cultural Gala',
          event_date: '2026-12-02',
          event_time: '05:00 PM - 10:00 PM',
          event_type: 'Cultural Fest & Performing Arts',
          participating_colleges: 'Fergusson College, Symbiosis International, Modern College, BMCC Commerce College',
          expected_students: 550,
          expected_staff: 40,
          expected_guests: 60,
          total_participants: 650,
          buffer_percentage: 10.0,
          extra_chairs: 65,
          total_chairs: 715,
          estimated_tables: 20,
          required_volunteers: 35,
          venue: 'Open Air Amphitheatre',
          venue_capacity: 1500,
          additional_requirements: 'Stage lighting truss, 10 stage spot lights, green room partition screens, 2 backup generators.',
          status: 'Planning',
          organizer_contact: 'Cultural Coordinator Sneha K. (+91 97654 32109)'
        }
      ];
      localStorage.setItem('scms_events', JSON.stringify(events));

      // Seed Devices
      const devices = [
        { id: 1, device_id: 'BIO-GATE-01', name: 'Main Campus Gate Terminal', location: 'Main Security Checkpoint', ip_address: '192.168.10.41', device_type: 'Face Recognition + Biometric Thumb', api_key: 'BIO_KEY_GATE01_SECURE', status: 'Online', last_sync: 'Just now' },
        { id: 2, device_id: 'BIO-ADMIN-02', name: 'Admin Block Ground Floor Scanner', location: 'Central Administrative Office Foyer', ip_address: '192.168.10.42', device_type: 'Optical High-Speed Fingerprint', api_key: 'BIO_KEY_ADMIN02_SECURE', status: 'Online', last_sync: '2 mins ago' },
        { id: 3, device_id: 'BIO-MAINT-03', name: 'Maintenance & Workshop Terminal', location: 'Central Engineering Workshop Bay', ip_address: '192.168.10.43', device_type: 'Ruggedized Biometric Sensor', api_key: 'BIO_KEY_MAINT03_SECURE', status: 'Online', last_sync: '1 min ago' },
        { id: 4, device_id: 'BIO-AUDI-04', name: 'Auditorium & Events Wing Terminal', location: 'Main Auditorium Stage Entrance', ip_address: '192.168.10.44', device_type: 'Smart Card + Face Terminal', api_key: 'BIO_KEY_AUDI04_SECURE', status: 'Online', last_sync: 'Just now' }
      ];
      localStorage.setItem('scms_devices', JSON.stringify(devices));

      // Seed Tasks
      const tasks = [
        { id: 1, title: 'Arrange 275 cushioned chairs in Main Auditorium for TechSymposium', category: 'Seating', assigned_to: 'Mahesh Kadam (Carpentry)', priority: 'High', status: 'In Progress', due_date: '2026-11-19' },
        { id: 2, title: 'Setup 14 tables in Auditorium Foyer with navy blue skirts', category: 'Seating', assigned_to: 'Sunil Solanki (Housekeeping)', priority: 'High', status: 'Pending', due_date: '2026-11-19' },
        { id: 3, title: 'Inspect Audio/Visual: 4 wireless mics + podium LED screen', category: 'Audio/Visual', assigned_to: 'Dinesh Joshi (AV Tech)', priority: 'High', status: 'In Progress', due_date: '2026-11-19' },
        { id: 4, title: 'Deploy 3 water dispensers with paper cup holders in Auditorium', category: 'Housekeeping', assigned_to: 'Santosh Patil (Plumbing)', priority: 'Medium', status: 'Pending', due_date: '2026-11-19' }
      ];
      localStorage.setItem('scms_tasks', JSON.stringify(tasks));
    }
    this.initialized = true;
  }
};

MockStore.init();

const API = {
  // Base request handler with seamless local/cloud fallback
  async request(endpoint, options = {}) {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    options.headers = { ...defaultHeaders, ...options.headers };

    try {
      const response = await fetch(endpoint, options);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.warn(`Backend fetch [${endpoint}] failed. Falling back to persistent client storage engine:`, error);
      return this.handleClientFallback(endpoint, options);
    }
  },

  handleClientFallback(endpoint, options) {
    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body) : {};

    // 1. Dashboard Summary
    if (endpoint.startsWith('/api/dashboard/summary')) {
      const staff = JSON.parse(localStorage.getItem('scms_staff') || '[]');
      const att = JSON.parse(localStorage.getItem('scms_attendance') || '[]');
      const events = JSON.parse(localStorage.getItem('scms_events') || '[]');
      const tasks = JSON.parse(localStorage.getItem('scms_tasks') || '[]');

      const presentCount = att.filter(a => a.status === 'Present').length;
      const absentCount = att.filter(a => a.status === 'Absent').length;
      const pendingCount = att.filter(a => a.status === 'Not Checked In').length;
      const biometricCount = att.filter(a => a.method === 'Biometric Device').length;
      const manualCount = att.filter(a => a.method === 'Manual Entry').length;

      const upcomingEvents = events.filter(e => e.status !== 'Cancelled');
      const totalParticipants = upcomingEvents.reduce((s, e) => s + e.total_participants, 0);
      const totalChairs = upcomingEvents.reduce((s, e) => s + e.total_chairs, 0);

      return {
        today: new Date().toISOString().split('T')[0],
        staffStats: {
          totalStaff: staff.length,
          present: presentCount,
          absent: absentCount,
          notCheckedIn: pendingCount,
          attendancePercentage: Math.round((presentCount / staff.length) * 100),
          biometricCount,
          manualCount
        },
        eventStats: {
          upcomingCount: upcomingEvents.length,
          totalExpectedParticipants: totalParticipants,
          totalChairsRequired: totalChairs,
          totalTablesRequired: upcomingEvents.reduce((s, e) => s + e.estimated_tables, 0)
        },
        pendingTasksCount: tasks.filter(t => t.status !== 'Completed').length,
        upcomingEvents: upcomingEvents.slice(0, 5),
        pendingTasks: tasks.filter(t => t.status !== 'Completed'),
        recentBiometricLogs: [
          { id: 101, device_id: 'BIO-GATE-01', staff_id: 'STF-102', staff_name: 'Anil Gangadhar Shinde', department: 'Electrical & HVAC', punch_time: '08:52 AM', punch_type: 'CHECK_IN', verification_type: 'Fingerprint', confidence_score: 99.4 },
          { id: 102, device_id: 'BIO-MAINT-03', staff_id: 'STF-101', staff_name: 'Rajesh Kumar Verma', department: 'Maintenance & Housekeeping', punch_time: '07:28 AM', punch_type: 'CHECK_IN', verification_type: 'Fingerprint', confidence_score: 99.1 }
        ],
        trendData: [
          { date: '2026-11-09', present: 17, absent: 3 },
          { date: '2026-11-10', present: 18, absent: 2 },
          { date: '2026-11-11', present: 16, absent: 4 },
          { date: '2026-11-12', present: 19, absent: 1 },
          { date: '2026-11-13', present: presentCount, absent: absentCount }
        ],
        deptAttendance: [
          { department: 'Maintenance & Housekeeping', total_staff: 5, present_count: 4 },
          { department: 'Electrical & HVAC', total_staff: 3, present_count: 2 },
          { department: 'Civil & Carpentry', total_staff: 3, present_count: 2 },
          { department: 'Administrative Office', total_staff: 3, present_count: 2 },
          { department: 'IT Infrastructure & Audio/Visual', total_staff: 2, present_count: 1 },
          { department: 'Campus Security', total_staff: 2, present_count: 2 },
          { department: 'Computer Science & Engg', total_staff: 2, present_count: 1 }
        ]
      };
    }

    // 2. Today's Attendance
    if (endpoint.startsWith('/api/attendance/today')) {
      const staff = JSON.parse(localStorage.getItem('scms_staff') || '[]');
      const att = JSON.parse(localStorage.getItem('scms_attendance') || '[]');
      const records = staff.map(s => {
        const a = att.find(x => x.staff_id === s.staff_id) || {};
        return {
          staff_pk: s.id,
          staff_id: s.staff_id,
          name: s.name,
          department: s.department,
          designation: s.designation,
          shift: s.shift,
          phone: s.phone,
          status: a.status || 'Not Checked In',
          check_in: a.check_in || null,
          check_out: a.check_out || null,
          method: a.method || 'Pending',
          device_id: a.device_id || null,
          remarks: a.remarks || ''
        };
      });

      const depts = [...new Set(staff.map(s => s.department))];
      return { records, departments: depts };
    }

    // 3. Manual Attendance Override
    if (endpoint.startsWith('/api/attendance/manual-entry') && method === 'POST') {
      const att = JSON.parse(localStorage.getItem('scms_attendance') || '[]');
      const idx = att.findIndex(a => a.staff_id === body.staff_id);
      const item = {
        staff_id: body.staff_id,
        date: body.date || new Date().toISOString().split('T')[0],
        status: body.status,
        check_in: body.check_in || (body.status === 'Present' ? '09:00 AM' : null),
        check_out: body.check_out || null,
        method: 'Manual Entry',
        device_id: 'MANUAL',
        remarks: body.remarks || 'Administrative manual override'
      };

      if (idx >= 0) att[idx] = item;
      else att.push(item);

      localStorage.setItem('scms_attendance', JSON.stringify(att));
      return { success: true, message: `Manual attendance recorded for ${body.staff_id}`, isManualOverride: true };
    }

    // 4. Biometric Device Sync
    if (endpoint.startsWith('/api/biometric/sync') && method === 'POST') {
      const att = JSON.parse(localStorage.getItem('scms_attendance') || '[]');
      const staff = JSON.parse(localStorage.getItem('scms_staff') || '[]');
      const s = staff.find(x => x.staff_id === body.staff_id) || { name: body.staff_id };

      const idx = att.findIndex(a => a.staff_id === body.staff_id);
      const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

      const item = {
        staff_id: body.staff_id,
        date: new Date().toISOString().split('T')[0],
        status: 'Present',
        check_in: body.timestamp || nowTime,
        check_out: body.punch_type === 'CHECK_OUT' ? nowTime : null,
        method: 'Biometric Device',
        device_id: body.device_id || 'BIO-GATE-01',
        remarks: `Biometric verified via ${body.verification_type || 'Fingerprint'} (${body.confidence_score || 99.4}%)`
      };

      if (idx >= 0) att[idx] = item;
      else att.push(item);

      localStorage.setItem('scms_attendance', JSON.stringify(att));
      return {
        success: true,
        message: `Biometric punch verified for ${s.name} (${body.staff_id})`,
        logId: Date.now()
      };
    }

    // 5. Events List
    if (endpoint.startsWith('/api/events') && method === 'GET') {
      const parts = endpoint.split('/');
      const last = parts[parts.length - 1];
      const events = JSON.parse(localStorage.getItem('scms_events') || '[]');

      if (!isNaN(parseInt(last))) {
        const found = events.find(e => e.id === parseInt(last));
        if (found) {
          const s = found.expected_students || 0;
          const f = found.expected_staff || 0;
          const g = found.expected_guests || 0;
          const b = found.buffer_percentage || 10;
          const tot = s + f + g;
          const ext = Math.round(tot * (b / 100));
          return {
            ...found,
            resourceCalculations: {
              numStudents: s,
              numStaff: f,
              numGuests: g,
              totalParticipants: tot,
              bufferPercent: b,
              extraChairs: ext,
              totalChairs: tot + ext,
              estimatedTables: found.estimated_tables,
              tableBreakdown: {
                registrationCounters: Math.max(2, Math.ceil(s / 60)),
                stageDaisTables: 2,
                guestHospitalityTables: Math.ceil(g / 8),
                refreshmentCounters: Math.max(2, Math.ceil(tot / 80))
              },
              requiredVolunteers: found.required_volunteers
            },
            tasks: JSON.parse(localStorage.getItem('scms_tasks') || '[]').filter(t => t.event_id === found.id)
          };
        }
      }
      return events;
    }

    // 6. Create Event
    if (endpoint.startsWith('/api/events') && method === 'POST') {
      const events = JSON.parse(localStorage.getItem('scms_events') || '[]');
      const s = parseInt(body.expected_students) || 0;
      const f = parseInt(body.expected_staff) || 0;
      const g = parseInt(body.expected_guests) || 0;
      const b = parseFloat(body.buffer_percentage) || 10.0;
      const tot = s + f + g;
      const ext = Math.round(tot * (b / 100));
      const chairs = tot + ext;
      const tables = Math.max(2, Math.ceil(s / 60)) + 2 + Math.ceil(g / 8) + Math.max(2, Math.ceil(tot / 80));
      const vol = Math.max(4, Math.ceil(s / 25) + Math.ceil(g / 10) + 2);

      const newEvt = {
        id: events.length + 1,
        ...body,
        total_participants: tot,
        extra_chairs: ext,
        total_chairs: chairs,
        estimated_tables: tables,
        required_volunteers: vol,
        status: body.status || 'Planning'
      };

      events.push(newEvt);
      localStorage.setItem('scms_events', JSON.stringify(events));
      return { success: true, message: 'Event planned successfully', eventId: newEvt.id };
    }

    // 7. Biometric Devices
    if (endpoint.startsWith('/api/biometric/devices')) {
      return JSON.parse(localStorage.getItem('scms_devices') || '[]');
    }

    // 8. Staff List
    if (endpoint.startsWith('/api/staff') && method === 'GET') {
      return JSON.parse(localStorage.getItem('scms_staff') || '[]');
    }

    // 9. Tasks List
    if (endpoint.startsWith('/api/tasks') && method === 'GET') {
      return JSON.parse(localStorage.getItem('scms_tasks') || '[]');
    }

    if (endpoint.startsWith('/api/tasks') && method === 'PATCH') {
      const tasks = JSON.parse(localStorage.getItem('scms_tasks') || '[]');
      const id = parseInt(endpoint.split('/')[3]);
      const found = tasks.find(t => t.id === id);
      if (found) found.status = body.status;
      localStorage.setItem('scms_tasks', JSON.stringify(tasks));
      return { success: true };
    }

    // 10. Auth login
    if (endpoint.startsWith('/api/auth/login')) {
      return {
        success: true,
        user: { username: body.username, full_name: 'Er. Suresh Patil', designation: 'Chief Maintenance Supervisor', role: 'supervisor' }
      };
    }

    return {};
  },

  // Auth
  login(username, password) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  },

  getCurrentUser() {
    return this.request('/api/auth/current');
  },

  getDashboardSummary() {
    return this.request('/api/dashboard/summary');
  },

  getStaff(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request(`/api/staff${q ? '?' + q : ''}`);
  },

  addStaff(staffData) {
    return this.request('/api/staff', {
      method: 'POST',
      body: JSON.stringify(staffData)
    });
  },

  getTodayAttendance(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request(`/api/attendance/today${q ? '?' + q : ''}`);
  },

  saveManualAttendance(data) {
    return this.request('/api/attendance/manual-entry', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  getEvents(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request(`/api/events${q ? '?' + q : ''}`);
  },

  getEventById(id) {
    return this.request(`/api/events/${id}`);
  },

  createEvent(eventData) {
    return this.request('/api/events', {
      method: 'POST',
      body: JSON.stringify(eventData)
    });
  },

  updateEvent(id, eventData) {
    return this.request(`/api/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(eventData)
    });
  },

  deleteEvent(id) {
    return this.request(`/api/events/${id}`, {
      method: 'DELETE'
    });
  },

  getBiometricDevices() {
    return this.request('/api/biometric/devices');
  },

  getBiometricLogs() {
    return this.request('/api/biometric/logs');
  },

  syncBiometricPunch(payload, apiKey) {
    const headers = {};
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    return this.request('/api/biometric/sync', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
  },

  getTasks(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request(`/api/tasks${q ? '?' + q : ''}`);
  },

  createTask(taskData) {
    return this.request('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
  },

  updateTaskStatus(id, status) {
    return this.request(`/api/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }
};
