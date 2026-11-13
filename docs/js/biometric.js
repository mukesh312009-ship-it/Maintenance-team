/**
 * Smart Campus Management System - Biometric Gateway & Integration Hub
 * Architecture ready for college biometric device integration via Authorized REST API
 */

const BiometricModule = {
  devices: [],
  logs: [],
  staffList: [],

  async load() {
    this.bindEvents();
    await Promise.all([
      this.fetchDevices(),
      this.fetchLogs(),
      this.fetchStaffForSimulator(),
      this.loadApiSpecs()
    ]);
  },

  bindEvents() {
    // 1. Tab Simulator Form
    const simForm = document.getElementById('form-biometric-simulator');
    if (simForm && !simForm.dataset.bound) {
      simForm.dataset.bound = 'true';
      simForm.addEventListener('submit', (e) => this.handleSimulateScan(e, 'tab'));
    }

    const confSlider = document.getElementById('sim-confidence-slider');
    const confVal = document.getElementById('sim-confidence-val');
    if (confSlider && confVal && !confSlider.dataset.bound) {
      confSlider.dataset.bound = 'true';
      confSlider.addEventListener('input', () => {
        confVal.textContent = `${confSlider.value}%`;
      });
    }

    // 2. Modal Simulator Form
    const modalSimForm = document.getElementById('form-modal-biometric-simulator');
    if (modalSimForm && !modalSimForm.dataset.bound) {
      modalSimForm.dataset.bound = 'true';
      modalSimForm.addEventListener('submit', (e) => this.handleSimulateScan(e, 'modal'));
    }

    const modalConfSlider = document.getElementById('modal-sim-conf-slider');
    const modalConfLabel = document.getElementById('modal-sim-conf-label');
    if (modalConfSlider && modalConfLabel && !modalConfSlider.dataset.bound) {
      modalConfSlider.dataset.bound = 'true';
      modalConfSlider.addEventListener('input', () => {
        modalConfLabel.textContent = `${modalConfSlider.value}%`;
      });
    }
  },

  async fetchDevices() {
    try {
      this.devices = await API.getBiometricDevices();
      this.renderDevicesList(this.devices);
      this.populateDeviceDropdowns();
    } catch (err) {
      console.error('Error fetching biometric devices:', err);
    }
  },

  async fetchLogs() {
    try {
      this.logs = await API.getBiometricLogs();
      this.renderAuditLogsTable(this.logs);
    } catch (err) {
      console.error('Error fetching biometric logs:', err);
    }
  },

  async fetchStaffForSimulator() {
    try {
      this.staffList = await API.getStaff();
      const optionsHtml = `<option value="">-- Choose Staff Member --</option>` + 
        this.staffList.map(s => `<option value="${s.staff_id}">${s.name} (${s.staff_id}) - ${s.department}</option>`).join('');

      const staffSelect = document.getElementById('sim-staff-select');
      if (staffSelect) staffSelect.innerHTML = optionsHtml;

      const modalStaffSelect = document.getElementById('modal-sim-staff');
      if (modalStaffSelect) modalStaffSelect.innerHTML = optionsHtml;
    } catch (err) {
      console.error('Error fetching staff list for simulator:', err);
    }
  },

  populateDeviceDropdowns() {
    const devSelect = document.getElementById('sim-device-select');
    if (devSelect) {
      devSelect.innerHTML = this.devices.map(d => `
        <option value="${d.device_id}" data-key="${d.api_key}">
          ${d.name} (${d.device_id}) &bull; ${d.location}
        </option>
      `).join('');
    }

    const modalDevSelect = document.getElementById('modal-sim-device');
    if (modalDevSelect && this.devices.length > 0) {
      modalDevSelect.innerHTML = this.devices.map(d => `
        <option value="${d.device_id}" data-key="${d.api_key}">
          ${d.name} (${d.device_id})
        </option>
      `).join('');
    }
  },

  renderDevicesList(devices) {
    const container = document.getElementById('biometric-devices-list');
    if (!container) return;

    container.innerHTML = devices.map(d => `
      <div class="hardware-card">
        <div class="hardware-icon">
          <i class="fas fa-fingerprint"></i>
        </div>
        <div class="hardware-info" style="flex:1;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <h4>${d.name}</h4>
            <span class="badge ${d.status === 'Online' ? 'badge-present' : 'badge-absent'}">
              <span class="hardware-status-dot"></span> ${d.status}
            </span>
          </div>
          <p style="margin-top: 4px;">
            <strong>Terminal ID:</strong> <code>${d.device_id}</code> &bull; 
            <strong>IP:</strong> ${d.ip_address} &bull; 
            <strong>Type:</strong> ${d.device_type}
          </p>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
            <i class="fas fa-key"></i> Auth Key: <code>${d.api_key}</code> &bull; 
            <i class="far fa-clock"></i> Last Heartbeat: ${d.last_sync || 'Just now'}
          </div>
        </div>
        <div>
          <button class="btn btn-outline btn-sm" onclick="BiometricModule.quickSimulateForDevice('${d.device_id}')">
            <i class="fas fa-play"></i> Test Scan
          </button>
        </div>
      </div>
    `).join('');
  },

  renderAuditLogsTable(logs) {
    const tbody = document.getElementById('biometric-audit-table-body');
    if (!tbody) return;

    if (logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No raw biometric device logs recorded yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = logs.slice(0, 25).map(l => `
      <tr>
        <td><code>#${l.id}</code></td>
        <td>
          <span class="badge badge-biometric">
            <i class="fas fa-microchip"></i> ${l.device_id}
          </span>
          <div style="font-size: 11px; color: var(--text-muted);">${l.device_name || ''}</div>
        </td>
        <td>
          <strong>${l.staff_name || l.staff_id}</strong>
          <div style="font-size: 11px; color: var(--text-muted);">${l.staff_id} &bull; ${l.department || 'Staff'}</div>
        </td>
        <td>
          <span class="badge ${l.punch_type === 'CHECK_IN' ? 'badge-present' : 'badge-pending'}">
            ${l.punch_type === 'CHECK_IN' ? 'Check In' : 'Check Out'}
          </span>
        </td>
        <td style="font-size: 12.5px;">${l.punch_time}</td>
        <td>
          <span class="badge badge-dept">
            <i class="fas fa-id-card"></i> ${l.verification_type}
          </span>
        </td>
        <td style="color: #059669; font-weight: 700; font-size: 12px;">
          ${l.confidence_score}%
        </td>
      </tr>
    `).join('');
  },

  loadApiSpecs() {
    const specsBox = document.getElementById('biometric-specs-console');
    if (!specsBox) return;

    specsBox.innerHTML = `
// 1. Authorized Device REST Endpoint
POST https://campus.edu/api/biometric/sync
Headers:
  Content-Type: application/json
  Authorization: Bearer BIO_KEY_GATE01_SECURE

// 2. Hardware Payload JSON Schema
{
  "device_id": "BIO-GATE-01",              // Registered terminal identifier [Required]
  "staff_id": "STF-101",                    // RFID / Enrolled Biometric Staff ID [Required]
  "punch_type": "CHECK_IN",                 // "CHECK_IN" or "CHECK_OUT"
  "verification_type": "Fingerprint",       // "Fingerprint" | "Facial Recognition" | "RFID Card"
  "confidence_score": 99.4,                 // Biometric AI Match Confidence Rate
  "timestamp": "08:52 AM"                   // Hardware terminal clock
}

// 3. Command-line cURL test for network technician:
curl -X POST http://localhost:3000/api/biometric/sync \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer BIO_KEY_GATE01_SECURE" \\
  -d '{"device_id":"BIO-GATE-01","staff_id":"STF-101","punch_type":"CHECK_IN","verification_type":"Fingerprint","confidence_score":99.4}'
    `.trim();
  },

  openSimulateModal(preselectedStaffId = null) {
    if (this.staffList.length === 0) {
      this.fetchStaffForSimulator().then(() => this.openSimulateModal(preselectedStaffId));
      return;
    }

    if (preselectedStaffId) {
      const modalStaffSelect = document.getElementById('modal-sim-staff');
      if (modalStaffSelect) modalStaffSelect.value = preselectedStaffId;
    }

    const consoleOut = document.getElementById('modal-sim-terminal');
    if (consoleOut) {
      consoleOut.style.display = 'none';
      consoleOut.textContent = '';
    }

    App.openModal('modal-biometric-simulator');
  },

  quickSimulateForDevice(deviceId) {
    const devSelect = document.getElementById('sim-device-select');
    if (devSelect) devSelect.value = deviceId;
    const modalDevSelect = document.getElementById('modal-sim-device');
    if (modalDevSelect) modalDevSelect.value = deviceId;
    this.openSimulateModal();
  },

  async handleSimulateScan(e, context = 'tab') {
    e.preventDefault();

    const isModal = context === 'modal';
    const staffId = document.getElementById(isModal ? 'modal-sim-staff' : 'sim-staff-select').value;
    const deviceId = document.getElementById(isModal ? 'modal-sim-device' : 'sim-device-select').value;
    const punchType = document.getElementById(isModal ? 'modal-sim-punch-type' : 'sim-punch-type').value;
    const verifType = document.getElementById(isModal ? 'modal-sim-verif-type' : 'sim-verif-type').value;
    const confInput = document.getElementById(isModal ? 'modal-sim-conf-slider' : 'sim-confidence-slider');
    const confidence = parseFloat(confInput?.value) || 99.4;

    if (!staffId || !deviceId) {
      App.toast('Please select both a device and a staff member', 'warning');
      return;
    }

    const devOption = document.querySelector(`#${isModal ? 'modal-sim-device' : 'sim-device-select'} option[value="${deviceId}"]`);
    const apiKey = devOption ? devOption.getAttribute('data-key') : 'BIO_KEY_GATE01_SECURE';

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const payload = {
      device_id: deviceId,
      staff_id: staffId,
      punch_type: punchType,
      verification_type: verifType,
      confidence_score: confidence,
      timestamp: timeStr
    };

    const consoleOut = document.getElementById(isModal ? 'modal-sim-terminal' : 'sim-terminal-output');
    if (consoleOut) {
      consoleOut.style.display = 'block';
      consoleOut.textContent = `[TX] Authenticating with REST Gateway /api/biometric/sync ...\n` +
        `Authorization: Bearer ${apiKey}\n` +
        `Payload: ${JSON.stringify(payload, null, 2)}\n\nProcessing scan...`;
    }

    try {
      const res = await API.syncBiometricPunch(payload, apiKey);

      if (consoleOut) {
        consoleOut.textContent += `\n\n[RX HTTP 200 OK] Response:\n` + JSON.stringify(res, null, 2) +
          `\n\n[SUCCESS] Biometric hardware punch recorded! Staff attendance updated.`;
      }

      App.toast(`Biometric scan verified for ${staffId} via ${deviceId} (${confidence}% confidence)!`, 'success');

      // Refresh records
      await this.fetchLogs();
      if (typeof AttendanceModule !== 'undefined') {
        AttendanceModule.fetchTodayAttendance();
      }
      DashboardModule.load();
    } catch (err) {
      if (consoleOut) {
        consoleOut.textContent += `\n\n[ERROR] Device synchronization rejected:\n${err.message}`;
      }
      App.toast(err.message || 'Biometric sync failed', 'error');
    }
  }
};
