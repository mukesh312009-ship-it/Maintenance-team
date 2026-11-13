/**
 * Smart Campus Management System - Staff Attendance Management Module (Problem 1)
 */

const AttendanceModule = {
  currentRecords: [],
  departments: [],

  async load() {
    this.bindEvents();
    await this.fetchTodayAttendance();
  },

  bindEvents() {
    // Search input
    const searchInput = document.getElementById('att-search-input');
    if (searchInput && !searchInput.dataset.bound) {
      searchInput.dataset.bound = 'true';
      searchInput.addEventListener('input', () => this.applyFilters());
    }

    // Department filter
    const deptFilter = document.getElementById('att-dept-filter');
    if (deptFilter && !deptFilter.dataset.bound) {
      deptFilter.dataset.bound = 'true';
      deptFilter.addEventListener('change', () => this.applyFilters());
    }

    // Status filter
    const statusFilter = document.getElementById('att-status-filter');
    if (statusFilter && !statusFilter.dataset.bound) {
      statusFilter.dataset.bound = 'true';
      statusFilter.addEventListener('change', () => this.applyFilters());
    }

    // Date picker
    const datePicker = document.getElementById('att-date-picker');
    if (datePicker && !datePicker.dataset.bound) {
      datePicker.dataset.bound = 'true';
      datePicker.value = new Date().toISOString().split('T')[0];
      datePicker.addEventListener('change', () => this.fetchTodayAttendance());
    }

    // Add Staff Form Submission
    const staffForm = document.getElementById('form-add-staff');
    if (staffForm && !staffForm.dataset.bound) {
      staffForm.dataset.bound = 'true';
      staffForm.addEventListener('submit', (e) => this.handleAddStaff(e));
    }

    // Manual Attendance Override Form Submission
    const manualForm = document.getElementById('form-manual-attendance');
    if (manualForm && !manualForm.dataset.bound) {
      manualForm.dataset.bound = 'true';
      manualForm.addEventListener('submit', (e) => this.handleSaveManualAttendance(e));
    }

    // Export CSV
    const exportBtn = document.getElementById('btn-export-attendance');
    if (exportBtn && !exportBtn.dataset.bound) {
      exportBtn.dataset.bound = 'true';
      exportBtn.addEventListener('click', () => this.exportCSV());
    }

    // Print Sheet
    const printBtn = document.getElementById('btn-print-attendance');
    if (printBtn && !printBtn.dataset.bound) {
      printBtn.dataset.bound = 'true';
      printBtn.addEventListener('click', () => this.printAttendanceSheet());
    }
  },

  async fetchTodayAttendance() {
    try {
      const datePicker = document.getElementById('att-date-picker');
      const targetDate = datePicker ? datePicker.value : '';

      const res = await API.getTodayAttendance({ date: targetDate });
      this.currentRecords = res.records || [];
      this.departments = res.departments || [];

      this.populateDepartmentDropdown();
      this.renderSummary();
      this.renderTable(this.currentRecords);
    } catch (err) {
      console.error('Error fetching attendance:', err);
      App.toast('Failed to load attendance records', 'error');
    }
  },

  populateDepartmentDropdown() {
    const deptSelect = document.getElementById('att-dept-filter');
    if (!deptSelect) return;

    const currentVal = deptSelect.value;
    deptSelect.innerHTML = `<option value="All">All Departments</option>`;
    this.departments.forEach(dept => {
      deptSelect.innerHTML += `<option value="${dept}">${dept}</option>`;
    });
    deptSelect.value = currentVal || 'All';
  },

  renderSummary() {
    const total = this.currentRecords.length;
    const present = this.currentRecords.filter(r => r.status === 'Present').length;
    const absent = this.currentRecords.filter(r => r.status === 'Absent').length;
    const pending = this.currentRecords.filter(r => r.status === 'Not Checked In').length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    const totalEl = document.getElementById('att-sum-total');
    const presentEl = document.getElementById('att-sum-present');
    const absentEl = document.getElementById('att-sum-absent');
    const pendingEl = document.getElementById('att-sum-pending');
    const pctEl = document.getElementById('att-sum-pct');

    if (totalEl) totalEl.textContent = total;
    if (presentEl) presentEl.textContent = present;
    if (absentEl) absentEl.textContent = absent;
    if (pendingEl) pendingEl.textContent = pending;
    if (pctEl) pctEl.textContent = `${percentage}%`;
  },

  applyFilters() {
    const searchVal = (document.getElementById('att-search-input')?.value || '').toLowerCase().trim();
    const deptVal = document.getElementById('att-dept-filter')?.value || 'All';
    const statusVal = document.getElementById('att-status-filter')?.value || 'All';

    const filtered = this.currentRecords.filter(item => {
      const matchSearch = !searchVal || 
        item.name.toLowerCase().includes(searchVal) ||
        item.staff_id.toLowerCase().includes(searchVal) ||
        item.department.toLowerCase().includes(searchVal) ||
        item.designation.toLowerCase().includes(searchVal);

      const matchDept = (deptVal === 'All') || (item.department === deptVal);
      const matchStatus = (statusVal === 'All') || (item.status === statusVal);

      return matchSearch && matchDept && matchStatus;
    });

    this.renderTable(filtered);
  },

  renderTable(records) {
    const tbody = document.getElementById('attendance-table-body');
    if (!tbody) return;

    if (records.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 32px; color: var(--text-muted);">
            <i class="fas fa-search" style="font-size: 24px; margin-bottom: 8px;"></i>
            <p>No matching staff attendance records found.</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = records.map(staff => {
      let statusBadge = '<span class="badge badge-pending"><i class="fas fa-clock"></i> Not Checked In</span>';
      if (staff.status === 'Present') {
        statusBadge = '<span class="badge badge-present"><i class="fas fa-check-circle"></i> Present</span>';
      } else if (staff.status === 'Absent') {
        statusBadge = '<span class="badge badge-absent"><i class="fas fa-times-circle"></i> Absent</span>';
      }

      let methodBadge = '<span style="color: var(--text-muted); font-size: 11px;">--</span>';
      if (staff.method === 'Biometric Device') {
        methodBadge = `
          <span class="badge badge-biometric" title="Hardware sync from ${staff.device_id || 'Terminal'}">
            <i class="fas fa-fingerprint"></i> Biometric (${staff.device_id || 'Device'})
          </span>
        `;
      } else if (staff.method === 'Manual Entry') {
        methodBadge = `
          <span class="badge badge-manual" title="Manual supervisor entry for prototype">
            <i class="fas fa-user-edit"></i> Manual Override
          </span>
        `;
      }

      const checkInTime = staff.check_in || '<span style="color: var(--text-muted);">--:--</span>';
      const checkOutTime = staff.check_out || '<span style="color: var(--text-muted);">--:--</span>';

      return `
        <tr>
          <td>
            <div style="font-weight: 700; color: var(--secondary-navy);">${staff.staff_id}</div>
          </td>
          <td>
            <div style="font-weight: 600; color: var(--primary-navy);">${staff.name}</div>
            <div style="font-size: 11.5px; color: var(--text-muted);">${staff.designation}</div>
          </td>
          <td>
            <span class="badge badge-dept">${staff.department}</span>
          </td>
          <td>${statusBadge}</td>
          <td style="font-weight: 600; color: #047857;">${checkInTime}</td>
          <td style="color: var(--text-secondary);">${checkOutTime}</td>
          <td>${methodBadge}</td>
          <td style="text-align: right; white-space: nowrap;">
            <button class="btn btn-outline btn-sm" onclick="AttendanceModule.openManualModal('${staff.staff_id}', '${encodeURIComponent(staff.name)}', '${staff.status}', '${staff.check_in || ''}', '${staff.check_out || ''}', '${encodeURIComponent(staff.remarks || '')}')" title="Manual Attendance Override">
              <i class="fas fa-edit"></i> Override
            </button>
            <button class="btn btn-primary btn-sm" onclick="AttendanceModule.triggerQuickBiometric('${staff.staff_id}', '${encodeURIComponent(staff.name)}')" title="Simulate Biometric Scan for this Staff">
              <i class="fas fa-fingerprint"></i> Scan
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  openManualModal(staffId, staffNameEscaped, currentStatus, checkIn, checkOut, remarksEscaped) {
    const staffName = decodeURIComponent(staffNameEscaped);
    const remarks = decodeURIComponent(remarksEscaped);

    document.getElementById('manual-staff-id').value = staffId;
    document.getElementById('manual-staff-name').textContent = `${staffName} (${staffId})`;
    document.getElementById('manual-status').value = currentStatus || 'Present';
    document.getElementById('manual-checkin').value = checkIn || '';
    document.getElementById('manual-checkout').value = checkOut || '';
    document.getElementById('manual-remarks').value = remarks || '';

    App.openModal('modal-manual-attendance');
  },

  async handleSaveManualAttendance(e) {
    e.preventDefault();
    const staffId = document.getElementById('manual-staff-id').value;
    const status = document.getElementById('manual-status').value;
    const checkIn = document.getElementById('manual-checkin').value;
    const checkOut = document.getElementById('manual-checkout').value;
    const remarks = document.getElementById('manual-remarks').value;

    try {
      await API.saveManualAttendance({
        staff_id: staffId,
        status,
        check_in: checkIn,
        check_out: checkOut,
        remarks: remarks || `Administrative manual override on ${new Date().toLocaleDateString()}`
      });

      App.toast(`Manual attendance recorded for ${staffId} as ${status}. Note: Flagged as Manual Override.`, 'success');
      App.closeModal('modal-manual-attendance');
      await this.fetchTodayAttendance();
      DashboardModule.load();
    } catch (err) {
      App.toast(err.message || 'Failed to update attendance', 'error');
    }
  },

  openAddStaffModal() {
    document.getElementById('form-add-staff').reset();
    // Auto generate next staff id
    const nextNum = 100 + this.currentRecords.length + 1;
    document.getElementById('add-staff-id').value = `STF-${nextNum}`;
    App.openModal('modal-add-staff');
  },

  async handleAddStaff(e) {
    e.preventDefault();
    const staffData = {
      staff_id: document.getElementById('add-staff-id').value.trim(),
      name: document.getElementById('add-staff-name').value.trim(),
      department: document.getElementById('add-staff-dept').value,
      designation: document.getElementById('add-staff-desig').value.trim(),
      email: document.getElementById('add-staff-email').value.trim(),
      phone: document.getElementById('add-staff-phone').value.trim(),
      shift: document.getElementById('add-staff-shift').value
    };

    try {
      await API.addStaff(staffData);
      App.toast(`Staff member ${staffData.name} added successfully!`, 'success');
      App.closeModal('modal-add-staff');
      await this.fetchTodayAttendance();
      DashboardModule.load();
    } catch (err) {
      App.toast(err.message || 'Failed to add staff member', 'error');
    }
  },

  triggerQuickBiometric(staffId, staffNameEscaped) {
    BiometricModule.openSimulateModal(staffId);
  },

  exportCSV() {
    const datePicker = document.getElementById('att-date-picker');
    const targetDate = datePicker ? datePicker.value : '';
    window.location.href = `/api/attendance/export?date=${targetDate}`;
  },

  printAttendanceSheet() {
    const datePicker = document.getElementById('att-date-picker');
    const targetDate = datePicker ? datePicker.value : new Date().toLocaleDateString();

    const printArea = document.getElementById('printable-area');
    if (!printArea) return;

    const rowsHtml = this.currentRecords.map((r, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>${r.staff_id}</strong></td>
        <td>${r.name}</td>
        <td>${r.department}</td>
        <td><strong>${r.status}</strong></td>
        <td>${r.check_in || '--'}</td>
        <td>${r.method}</td>
        <td>${r.remarks || ''}</td>
      </tr>
    `).join('');

    printArea.innerHTML = `
      <div class="print-header">
        <div>
          <div class="print-title">College Maintenance Department - Staff Attendance Sheet</div>
          <div class="print-subtitle">Date: ${targetDate} | System Generated Biometric & Manual Roster</div>
        </div>
        <div style="text-align: right; font-size: 10pt;">
          Smart Campus Management System
        </div>
      </div>

      <table class="print-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Staff ID</th>
            <th>Staff Name</th>
            <th>Department</th>
            <th>Status</th>
            <th>Check In</th>
            <th>Verification</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="print-signatures">
        <div class="print-sig-box">
          Maintenance Supervisor
        </div>
        <div class="print-sig-box">
          Dean of Infrastructure
        </div>
      </div>
    `;

    window.print();
  }
};
