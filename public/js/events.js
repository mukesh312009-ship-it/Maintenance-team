/**
 * Smart Campus Management System - Inter-College Event Resource Planning (Problem 2)
 */

const EventsModule = {
  eventsList: [],
  currentEvent: null,

  async load() {
    this.bindEvents();
    await this.fetchEvents();
  },

  bindEvents() {
    // Dynamic Calculator inputs in Create/Edit Event Form
    const inputStudents = document.getElementById('event-students');
    const inputStaff = document.getElementById('event-staff');
    const inputGuests = document.getElementById('event-guests');
    const inputBuffer = document.getElementById('event-buffer');
    const inputVenue = document.getElementById('event-venue');

    const updateCalcPreview = () => {
      this.recalculateFormPreview();
    };

    [inputStudents, inputStaff, inputGuests, inputBuffer, inputVenue].forEach(input => {
      if (input && !input.dataset.bound) {
        input.dataset.bound = 'true';
        input.addEventListener('input', updateCalcPreview);
        input.addEventListener('change', updateCalcPreview);
      }
    });

    // Form submission
    const eventForm = document.getElementById('form-event-plan');
    if (eventForm && !eventForm.dataset.bound) {
      eventForm.dataset.bound = 'true';
      eventForm.addEventListener('submit', (e) => this.handleSaveEvent(e));
    }

    // Filter changes
    const filterStatus = document.getElementById('event-status-filter');
    if (filterStatus && !filterStatus.dataset.bound) {
      filterStatus.dataset.bound = 'true';
      filterStatus.addEventListener('change', () => this.filterEvents());
    }

    const searchInput = document.getElementById('event-search-input');
    if (searchInput && !searchInput.dataset.bound) {
      searchInput.dataset.bound = 'true';
      searchInput.addEventListener('input', () => this.filterEvents());
    }
  },

  async fetchEvents() {
    try {
      this.eventsList = await API.getEvents();
      this.renderEventsGrid(this.eventsList);
      this.renderEventSummaryCards(this.eventsList);
    } catch (err) {
      console.error('Error fetching events:', err);
      App.toast('Failed to load event list', 'error');
    }
  },

  renderEventSummaryCards(events) {
    const today = new Date().toISOString().split('T')[0];
    const upcoming = events.filter(e => e.event_date >= today && e.status !== 'Cancelled');
    const totalParticipants = upcoming.reduce((sum, e) => sum + (e.total_participants || 0), 0);
    const totalChairs = upcoming.reduce((sum, e) => sum + (e.total_chairs || 0), 0);
    const totalTables = upcoming.reduce((sum, e) => sum + (e.estimated_tables || 0), 0);

    const upEl = document.getElementById('event-sum-upcoming');
    const partEl = document.getElementById('event-sum-participants');
    const chairEl = document.getElementById('event-sum-chairs');
    const tableEl = document.getElementById('event-sum-tables');

    if (upEl) upEl.textContent = upcoming.length;
    if (partEl) partEl.textContent = totalParticipants.toLocaleString();
    if (chairEl) chairEl.textContent = totalChairs.toLocaleString();
    if (tableEl) tableEl.textContent = totalTables.toLocaleString();
  },

  recalculateFormPreview() {
    const students = parseInt(document.getElementById('event-students')?.value) || 0;
    const staff = parseInt(document.getElementById('event-staff')?.value) || 0;
    const guests = parseInt(document.getElementById('event-guests')?.value) || 0;
    const buffer = parseFloat(document.getElementById('event-buffer')?.value) || 10.0;

    const totalParticipants = students + staff + guests;
    const extraChairs = Math.round(totalParticipants * (buffer / 100));
    const totalChairs = totalParticipants + extraChairs;

    // Tables calculation breakdown
    const regTables = Math.max(2, Math.ceil(students / 60));
    const daisTables = 2;
    const guestTables = Math.ceil(guests / 8);
    const foodTables = Math.max(2, Math.ceil(totalParticipants / 80));
    const estimatedTables = regTables + daisTables + guestTables + foodTables;

    // Volunteers
    const volunteers = Math.max(4, Math.ceil(students / 25) + Math.ceil(guests / 10) + 2);

    // Update live DOM preview
    const prevTotal = document.getElementById('calc-prev-total-people');
    const prevExtra = document.getElementById('calc-prev-extra-chairs');
    const prevChairs = document.getElementById('calc-prev-total-chairs');
    const prevTables = document.getElementById('calc-prev-tables');
    const prevVolunteers = document.getElementById('calc-prev-volunteers');
    const prevWarning = document.getElementById('calc-venue-warning');

    if (prevTotal) prevTotal.textContent = totalParticipants;
    if (prevExtra) prevExtra.textContent = `+${extraChairs} (${buffer}%)`;
    if (prevChairs) prevChairs.textContent = totalChairs;
    if (prevTables) prevTables.textContent = estimatedTables;
    if (prevVolunteers) prevVolunteers.textContent = volunteers;

    // Venue capacity check
    const venueSelect = document.getElementById('event-venue');
    const selectedOption = venueSelect ? venueSelect.options[venueSelect.selectedIndex] : null;
    const venueCapacity = selectedOption ? parseInt(selectedOption.getAttribute('data-capacity') || '500') : 500;

    if (prevWarning) {
      if (totalParticipants > venueCapacity) {
        prevWarning.style.display = 'block';
        prevWarning.className = 'notice-box warning';
        prevWarning.innerHTML = `
          <i class="fas fa-exclamation-triangle"></i>
          <div>
            <strong>Capacity Warning!</strong> Expected attendees (${totalParticipants}) exceed venue capacity (${venueCapacity}). Consider booking a larger venue or arranging overflow halls.
          </div>
        `;
      } else {
        prevWarning.style.display = 'none';
      }
    }
  },

  filterEvents() {
    const searchVal = (document.getElementById('event-search-input')?.value || '').toLowerCase().trim();
    const statusVal = document.getElementById('event-status-filter')?.value || 'All';

    const filtered = this.eventsList.filter(evt => {
      const matchSearch = !searchVal ||
        evt.event_name.toLowerCase().includes(searchVal) ||
        evt.venue.toLowerCase().includes(searchVal) ||
        evt.participating_colleges.toLowerCase().includes(searchVal);

      const matchStatus = (statusVal === 'All') || (evt.status === statusVal);

      return matchSearch && matchStatus;
    });

    this.renderEventsGrid(filtered);
  },

  renderEventsGrid(events) {
    const container = document.getElementById('events-cards-grid');
    if (!container) return;

    if (events.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px; background: white; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <i class="fas fa-calendar-times" style="font-size: 32px; color: var(--text-muted); margin-bottom: 12px;"></i>
          <h3>No events found</h3>
          <p style="color: var(--text-muted); margin-top: 4px;">Try adjusting your filters or click "Plan New Event" to create a new requirement sheet.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = events.map(evt => {
      let statusClass = 'badge-present';
      if (evt.status === 'Planning') statusClass = 'badge-pending';
      if (evt.status === 'Setup In Progress') statusClass = 'badge-biometric';
      if (evt.status === 'Cancelled') statusClass = 'badge-absent';

      return `
        <div class="event-card" id="event-card-${evt.id}">
          <div class="event-card-header">
            <div>
              <span class="event-type-badge">${evt.event_type}</span>
              <h3 class="event-title" style="margin-top: 6px;">${evt.event_name}</h3>
            </div>
            <span class="badge ${statusClass}">${evt.status}</span>
          </div>

          <div class="event-meta">
            <div class="event-meta-item">
              <i class="far fa-calendar-alt"></i>
              <span><strong>Date:</strong> ${evt.event_date} (${evt.event_time})</span>
            </div>
            <div class="event-meta-item">
              <i class="fas fa-map-marker-alt"></i>
              <span><strong>Venue:</strong> ${evt.venue} (Cap: ${evt.venue_capacity || 500})</span>
            </div>
            <div class="event-meta-item">
              <i class="fas fa-university"></i>
              <span style="font-size: 11.5px; color: var(--text-muted);">${evt.participating_colleges || 'Internal & External Colleges'}</span>
            </div>
          </div>

          <!-- Calculated Resource Callout -->
          <div class="event-resource-callout">
            <div>
              <div class="resource-chip-label">Total People</div>
              <div class="resource-chip-val">${evt.total_participants}</div>
              <div style="font-size: 10px; color: var(--text-muted);">${evt.expected_students}S / ${evt.expected_staff}F / ${evt.expected_guests}G</div>
            </div>
            <div>
              <div class="resource-chip-label">Chairs (+${evt.buffer_percentage}%)</div>
              <div class="resource-chip-val" style="color: #0284c7;">${evt.total_chairs}</div>
              <div style="font-size: 10px; color: var(--text-muted);">${evt.extra_chairs} Buffer Chairs</div>
            </div>
            <div>
              <div class="resource-chip-label">Est. Tables</div>
              <div class="resource-chip-val" style="color: #059669;">${evt.estimated_tables}</div>
              <div style="font-size: 10px; color: var(--text-muted);">${evt.required_volunteers} Volunteers</div>
            </div>
          </div>

          <div class="event-card-footer">
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-outline btn-sm" onclick="EventsModule.openDetailModal(${evt.id})" title="View Resource Breakdown">
                <i class="fas fa-eye"></i> Details
              </button>
              <button class="btn btn-outline btn-sm" onclick="EventsModule.printResourceSlip(${evt.id})" title="Print Maintenance Work Order Slip">
                <i class="fas fa-print"></i> Slip
              </button>
              <button class="btn btn-outline btn-sm" onclick="EventsModule.downloadEventPDF(${evt.id})" title="Download Requirements PDF">
                <i class="fas fa-file-pdf" style="color: #dc2626;"></i> PDF
              </button>
            </div>
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-outline btn-sm" onclick="EventsModule.openEditModal(${evt.id})" title="Edit Event Details">
                <i class="fas fa-pencil-alt"></i>
              </button>
              <button class="btn btn-outline btn-sm" style="color: #dc2626;" onclick="EventsModule.deleteEventPlan(${evt.id})" title="Delete Event">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  openCreateModal() {
    document.getElementById('form-event-plan').reset();
    document.getElementById('event-modal-id').value = '';
    document.getElementById('event-modal-title').textContent = 'Plan New Inter-College Event';
    document.getElementById('event-buffer').value = '10.0';
    document.getElementById('event-date').value = new Date().toISOString().split('T')[0];

    this.recalculateFormPreview();
    App.openModal('modal-event-plan');
  },

  openEditModal(eventId) {
    const evt = this.eventsList.find(e => e.id === eventId);
    if (!evt) return;

    document.getElementById('event-modal-id').value = evt.id;
    document.getElementById('event-modal-title').textContent = `Edit Event: ${evt.event_name}`;
    document.getElementById('event-name').value = evt.event_name;
    document.getElementById('event-date').value = evt.event_date;
    document.getElementById('event-time').value = evt.event_time;
    document.getElementById('event-type').value = evt.event_type;
    document.getElementById('event-colleges').value = evt.participating_colleges;
    document.getElementById('event-students').value = evt.expected_students;
    document.getElementById('event-staff').value = evt.expected_staff;
    document.getElementById('event-guests').value = evt.expected_guests;
    document.getElementById('event-buffer').value = evt.buffer_percentage;
    document.getElementById('event-venue').value = evt.venue;
    document.getElementById('event-requirements').value = evt.additional_requirements || '';
    document.getElementById('event-organizer').value = evt.organizer_contact || '';
    document.getElementById('event-status').value = evt.status || 'Planning';

    this.recalculateFormPreview();
    App.openModal('modal-event-plan');
  },

  async handleSaveEvent(e) {
    e.preventDefault();
    const eventId = document.getElementById('event-modal-id').value;

    const venueSelect = document.getElementById('event-venue');
    const selectedOption = venueSelect ? venueSelect.options[venueSelect.selectedIndex] : null;
    const venueCapacity = selectedOption ? parseInt(selectedOption.getAttribute('data-capacity') || '500') : 500;

    const payload = {
      event_name: document.getElementById('event-name').value.trim(),
      event_date: document.getElementById('event-date').value,
      event_time: document.getElementById('event-time').value.trim(),
      event_type: document.getElementById('event-type').value,
      participating_colleges: document.getElementById('event-colleges').value.trim(),
      expected_students: parseInt(document.getElementById('event-students').value) || 0,
      expected_staff: parseInt(document.getElementById('event-staff').value) || 0,
      expected_guests: parseInt(document.getElementById('event-guests').value) || 0,
      buffer_percentage: parseFloat(document.getElementById('event-buffer').value) || 10.0,
      venue: document.getElementById('event-venue').value,
      venue_capacity: venueCapacity,
      additional_requirements: document.getElementById('event-requirements').value.trim(),
      organizer_contact: document.getElementById('event-organizer').value.trim(),
      status: document.getElementById('event-status').value
    };

    try {
      if (eventId) {
        await API.updateEvent(eventId, payload);
        App.toast('Event plan and chair/table requirements updated successfully!', 'success');
      } else {
        await API.createEvent(payload);
        App.toast('New event saved and maintenance work orders generated!', 'success');
      }

      App.closeModal('modal-event-plan');
      await this.fetchEvents();
      DashboardModule.load();
    } catch (err) {
      App.toast(err.message || 'Failed to save event', 'error');
    }
  },

  async deleteEventPlan(eventId) {
    if (!confirm('Are you sure you want to delete this event plan and its associated maintenance work orders?')) {
      return;
    }

    try {
      await API.deleteEvent(eventId);
      App.toast('Event plan deleted.', 'info');
      await this.fetchEvents();
      DashboardModule.load();
    } catch (err) {
      App.toast(err.message || 'Failed to delete event', 'error');
    }
  },

  async openDetailModal(eventId) {
    try {
      const evt = await API.getEventById(eventId);
      this.currentEvent = evt;

      const calc = evt.resourceCalculations;
      const modalBody = document.getElementById('detail-modal-content');
      if (!modalBody) return;

      modalBody.innerHTML = `
        <div style="margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <span class="badge badge-dept">${evt.event_type}</span>
              <h2 style="font-size: 18px; color: var(--primary-navy); margin-top: 6px;">${evt.event_name}</h2>
              <p style="color: var(--text-muted); font-size: 12.5px;">
                <i class="far fa-calendar-alt"></i> ${evt.event_date} (${evt.event_time}) &bull; <i class="fas fa-map-marker-alt"></i> ${evt.venue}
              </p>
            </div>
            <span class="badge badge-present" style="font-size: 13px;">${evt.status}</span>
          </div>
        </div>

        <!-- Automatic Calculation Card -->
        <div class="calc-display-card" style="margin-bottom: 20px;">
          <div class="calc-display-header">
            <h3><i class="fas fa-calculator"></i> Resource Allocation Engine</h3>
            <span class="calc-formula-badge">Formula: Total = (S + F + G) &bull; Extra = Total × ${calc.bufferPercent}%</span>
          </div>

          <div class="calc-metrics-row">
            <div class="calc-metric-box">
              <div class="calc-metric-num">${calc.totalParticipants}</div>
              <div class="calc-metric-desc">Total People</div>
              <div style="font-size: 10px; color: #cbd5e1; margin-top: 2px;">${calc.numStudents}S + ${calc.numStaff}F + ${calc.numGuests}G</div>
            </div>
            <div class="calc-metric-box">
              <div class="calc-metric-num">+${calc.extraChairs}</div>
              <div class="calc-metric-desc">Extra Buffer Chairs</div>
              <div style="font-size: 10px; color: #cbd5e1; margin-top: 2px;">${calc.bufferPercent}% Safety Margin</div>
            </div>
            <div class="calc-metric-box" style="background: rgba(56, 189, 248, 0.2); border-color: #38bdf8;">
              <div class="calc-metric-num" style="color: #ffffff;">${calc.totalChairs}</div>
              <div class="calc-metric-desc" style="color: #ffffff; font-weight: bold;">Total Chairs Req.</div>
              <div style="font-size: 10px; color: #e0f2fe; margin-top: 2px;">Warehouse Requisition</div>
            </div>
            <div class="calc-metric-box">
              <div class="calc-metric-num">${calc.estimatedTables}</div>
              <div class="calc-metric-desc">Tables Req.</div>
              <div style="font-size: 10px; color: #cbd5e1; margin-top: 2px;">4 Dedicated Zones</div>
            </div>
            <div class="calc-metric-box">
              <div class="calc-metric-num">${calc.requiredVolunteers}</div>
              <div class="calc-metric-desc">Volunteers Req.</div>
              <div style="font-size: 10px; color: #cbd5e1; margin-top: 2px;">Crowd & VIP Handling</div>
            </div>
          </div>
        </div>

        <!-- Detailed Tables Breakdown -->
        <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; margin-bottom: 20px;">
          <h4 style="font-size: 14px; color: var(--primary-navy); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-table" style="color: var(--secondary-navy);"></i> Detailed Table Staging Breakdown
          </h4>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; text-align: center;">
            <div style="background: var(--bg-subtle); padding: 10px; border-radius: var(--radius-sm);">
              <div style="font-size: 18px; font-weight: 700; color: var(--secondary-navy);">${calc.tableBreakdown.registrationCounters}</div>
              <div style="font-size: 11px; color: var(--text-muted);">Registration Desks (1 per 60 students)</div>
            </div>
            <div style="background: var(--bg-subtle); padding: 10px; border-radius: var(--radius-sm);">
              <div style="font-size: 18px; font-weight: 700; color: var(--secondary-navy);">${calc.tableBreakdown.stageDaisTables}</div>
              <div style="font-size: 11px; color: var(--text-muted);">VIP Stage Dais Tables</div>
            </div>
            <div style="background: var(--bg-subtle); padding: 10px; border-radius: var(--radius-sm);">
              <div style="font-size: 18px; font-weight: 700; color: var(--secondary-navy);">${calc.tableBreakdown.guestHospitalityTables}</div>
              <div style="font-size: 11px; color: var(--text-muted);">VIP / Judge Hospitality</div>
            </div>
            <div style="background: var(--bg-subtle); padding: 10px; border-radius: var(--radius-sm);">
              <div style="font-size: 18px; font-weight: 700; color: var(--secondary-navy);">${calc.tableBreakdown.refreshmentCounters}</div>
              <div style="font-size: 11px; color: var(--text-muted);">Refreshment & Water Counters</div>
            </div>
          </div>
        </div>

        <!-- Participating Colleges & Requirements -->
        <div style="margin-bottom: 20px;">
          <h4 style="font-size: 13px; color: var(--primary-navy); margin-bottom: 6px;"><i class="fas fa-university"></i> Participating Colleges</h4>
          <p style="font-size: 13px; color: var(--text-secondary); background: #f8fafc; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
            ${evt.participating_colleges || 'Internal College Event'}
          </p>
        </div>

        <div style="margin-bottom: 20px;">
          <h4 style="font-size: 13px; color: var(--primary-navy); margin-bottom: 6px;"><i class="fas fa-plug"></i> Technical & Additional Requirements</h4>
          <p style="font-size: 13px; color: var(--text-secondary); background: #f8fafc; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
            ${evt.additional_requirements || 'Standard venue audio/visual setup.'}
          </p>
        </div>

        <!-- Generated Maintenance Tasks -->
        <div>
          <h4 style="font-size: 13px; color: var(--primary-navy); margin-bottom: 8px;"><i class="fas fa-tasks"></i> Maintenance Staging Work Orders</h4>
          ${(evt.tasks && evt.tasks.length > 0) ? `
            <div class="tasks-list">
              ${evt.tasks.map(t => `
                <div class="task-item">
                  <span class="badge ${t.status === 'Completed' ? 'badge-present' : 'badge-pending'}">${t.status}</span>
                  <div class="task-content">
                    <div class="task-title">${t.title}</div>
                    <div class="task-meta">
                      <span>Assigned: ${t.assigned_to}</span> &bull; <span>Due: ${t.due_date}</span>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : '<p style="color: var(--text-muted); font-size: 12px;">No active work orders linked to this event.</p>'}
        </div>
      `;

      App.openModal('modal-event-detail');
    } catch (err) {
      App.toast('Failed to load event details', 'error');
    }
  },

  printResourceSlip(eventId) {
    const evt = this.eventsList.find(e => e.id === eventId);
    if (!evt) return;

    const printArea = document.getElementById('printable-area');
    if (!printArea) return;

    printArea.innerHTML = `
      <div class="print-header">
        <div>
          <div class="print-title">College Maintenance Department - Event Resource Requisition Slip</div>
          <div class="print-subtitle">Inter-College Event Logistics & Seating Work Order</div>
        </div>
        <div style="text-align: right; font-size: 10pt;">
          <strong>Slip ID:</strong> WO-${evt.id}-${evt.event_date.replace(/-/g, '')}<br>
          <strong>Issue Date:</strong> ${new Date().toLocaleDateString()}
        </div>
      </div>

      <div style="background: #f1f5f9; padding: 10px; margin-bottom: 16px; border: 1px solid #cbd5e1;">
        <strong>Event:</strong> ${evt.event_name}<br>
        <strong>Date & Time:</strong> ${evt.event_date} (${evt.event_time})<br>
        <strong>Venue:</strong> ${evt.venue} (Capacity: ${evt.venue_capacity || 500})<br>
        <strong>Participating Institutions:</strong> ${evt.participating_colleges || 'Open Registration'}<br>
        <strong>Convener / Contact:</strong> ${evt.organizer_contact || 'College Events Cell'}
      </div>

      <h3 style="font-size: 13pt; margin-top: 16px;">1. Certified Resource Requisition (Automatic Calculation)</h3>
      <table class="print-table">
        <thead>
          <tr>
            <th>Resource Item</th>
            <th>Base Estimate</th>
            <th>Buffer / Formula Applied</th>
            <th>Total Required to Deploy</th>
            <th>Deployment Verification</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Chairs (Audience + Dais)</strong></td>
            <td>${evt.total_participants} People (${evt.expected_students} Students + ${evt.expected_staff} Faculty + ${evt.expected_guests} Guests)</td>
            <td>+${evt.buffer_percentage}% Buffer (+${evt.extra_chairs} extra chairs)</td>
            <td style="font-size: 12pt;"><strong>${evt.total_chairs} Units</strong></td>
            <td>[  ] Placed & Inspected</td>
          </tr>
          <tr>
            <td><strong>Tables (Staged by Area)</strong></td>
            <td>4 Functional Zones</td>
            <td>Registration + Dais + VIP + Refreshments</td>
            <td style="font-size: 12pt;"><strong>${evt.estimated_tables} Units</strong></td>
            <td>[  ] Covered & Cleaned</td>
          </tr>
          <tr>
            <td><strong>Student / Staff Volunteers</strong></td>
            <td>Crowd Management</td>
            <td>1 per 25 attendees + VIP escorts</td>
            <td style="font-size: 12pt;"><strong>${evt.required_volunteers} Volunteers</strong></td>
            <td>[  ] Badges Issued</td>
          </tr>
        </tbody>
      </table>

      <h3 style="font-size: 13pt; margin-top: 16px;">2. Additional Technical & Facility Requirements</h3>
      <div style="border: 1px solid #94a3b8; padding: 10px; min-height: 60px; font-size: 10pt;">
        ${evt.additional_requirements || 'Standard stage podium, audio PA system, water dispensers, and power extensions.'}
      </div>

      <div class="print-signatures" style="margin-top: 50px;">
        <div class="print-sig-box">
          Seating Incharge (Carpentry)
        </div>
        <div class="print-sig-box">
          Chief Maintenance Supervisor
        </div>
        <div class="print-sig-box">
          Event Convener Sign-off
        </div>
      </div>
    `;

    window.print();
  },

  async downloadEventPDF(eventId) {
    // Generate the slip in print area and trigger html2pdf if loaded, or fallback to print
    this.printResourceSlip(eventId);
  }
};
