/**
 * Smart Campus Management System - Central Maintenance Dashboard Module
 */

const DashboardModule = {
  attendanceChart: null,
  deptChart: null,

  async load() {
    try {
      const summary = await API.getDashboardSummary();
      this.renderStats(summary);
      this.renderCharts(summary);
      this.renderUpcomingEvents(summary.upcomingEvents);
      this.renderPendingTasks(summary.pendingTasks);
      this.renderBiometricAudit(summary.recentBiometricLogs);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      App.toast('Failed to load dashboard summary', 'error');
    }
  },

  renderStats(summary) {
    const { staffStats, eventStats, pendingTasksCount, today } = summary;

    // Staff stats
    const totalStaffEl = document.getElementById('stat-total-staff');
    const presentStaffEl = document.getElementById('stat-present-staff');
    const absentStaffEl = document.getElementById('stat-absent-staff');
    const pendingStaffEl = document.getElementById('stat-pending-staff');
    const attPctEl = document.getElementById('stat-att-pct');
    const attPctSub = document.getElementById('stat-att-sub');

    if (totalStaffEl) totalStaffEl.textContent = staffStats.totalStaff;
    if (presentStaffEl) presentStaffEl.textContent = staffStats.present;
    if (absentStaffEl) absentStaffEl.textContent = staffStats.absent;
    if (pendingStaffEl) pendingStaffEl.textContent = staffStats.notCheckedIn;
    if (attPctEl) attPctEl.textContent = `${staffStats.attendancePercentage}%`;
    if (attPctSub) attPctSub.textContent = `${staffStats.biometricCount} via Biometric | ${staffStats.manualCount} Manual Override`;

    // Event stats
    const upcomingEventsEl = document.getElementById('stat-upcoming-events');
    const totalParticipantsEl = document.getElementById('stat-total-participants');
    const totalChairsEl = document.getElementById('stat-total-chairs');
    const pendingTasksEl = document.getElementById('stat-pending-tasks');

    if (upcomingEventsEl) upcomingEventsEl.textContent = eventStats.upcomingCount;
    if (totalParticipantsEl) totalParticipantsEl.textContent = eventStats.totalExpectedParticipants.toLocaleString();
    if (totalChairsEl) totalChairsEl.textContent = eventStats.totalChairsRequired.toLocaleString();
    if (pendingTasksEl) pendingTasksEl.textContent = pendingTasksCount;
  },

  renderCharts(summary) {
    // 1. Attendance 7-day Trend Chart
    const trendCtx = document.getElementById('chart-attendance-trend');
    if (trendCtx && typeof Chart !== 'undefined') {
      const trendData = summary.trendData || [];
      const labels = trendData.map(d => {
        const parts = d.date.split('-');
        return `${parts[1]}/${parts[2]}`;
      });
      const presentSeries = trendData.map(d => d.present);
      const absentSeries = trendData.map(d => d.absent);

      if (this.attendanceChart) {
        this.attendanceChart.destroy();
      }

      this.attendanceChart = new Chart(trendCtx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Present Staff',
              data: presentSeries,
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              fill: true,
              tension: 0.3,
              pointRadius: 4,
              borderWidth: 2
            },
            {
              label: 'Absent Staff',
              data: absentSeries,
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.05)',
              fill: true,
              tension: 0.3,
              pointRadius: 4,
              borderWidth: 2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: { boxWidth: 12, font: { size: 11 } }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { precision: 0 }
            }
          }
        }
      });
    }

    // 2. Department Attendance Doughnut / Bar Chart
    const deptCtx = document.getElementById('chart-dept-attendance');
    if (deptCtx && typeof Chart !== 'undefined') {
      const deptData = summary.deptAttendance || [];
      const deptLabels = deptData.map(d => {
        // Shorten long dept names for visual clarity
        return d.department.replace('& Housekeeping', '').replace('& Audio/Visual', '').trim();
      });
      const deptPresent = deptData.map(d => d.present_count || 0);

      if (this.deptChart) {
        this.deptChart.destroy();
      }

      this.deptChart = new Chart(deptCtx, {
        type: 'bar',
        data: {
          labels: deptLabels,
          datasets: [
            {
              label: 'Present Today',
              data: deptPresent,
              backgroundColor: '#1e3a8a',
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: {
              beginAtZero: true,
              ticks: { precision: 0 }
            }
          }
        }
      });
    }
  },

  renderUpcomingEvents(events = []) {
    const container = document.getElementById('dash-upcoming-events');
    if (!container) return;

    if (events.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 24px; color: var(--text-muted);">
          <i class="fas fa-calendar-check" style="font-size: 28px; margin-bottom: 8px;"></i>
          <p>No upcoming events scheduled. Click "Plan Event" to add one.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = events.map(evt => `
      <div class="event-item-mini" style="display: flex; align-items: center; justify-content: space-between; padding: 12px; border-bottom: 1px solid var(--border-color); gap: 12px;">
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 13.5px; color: var(--primary-navy);">${evt.event_name}</div>
          <div style="font-size: 11.5px; color: var(--text-muted); display: flex; gap: 12px; margin-top: 3px;">
            <span><i class="far fa-calendar-alt"></i> ${evt.event_date}</span>
            <span><i class="fas fa-map-marker-alt"></i> ${evt.venue}</span>
          </div>
        </div>
        <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end;">
          <span class="badge" style="background: var(--light-blue); color: var(--secondary-navy); font-weight: 700;">
            <i class="fas fa-chair"></i> ${evt.total_chairs} Chairs
          </span>
          <span style="font-size: 10.5px; color: var(--text-muted); margin-top: 4px;">
            ${evt.total_participants} People (+10% buf)
          </span>
        </div>
      </div>
    `).join('');
  },

  renderPendingTasks(tasks = []) {
    const container = document.getElementById('dash-pending-tasks');
    if (!container) return;

    if (tasks.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 24px; color: var(--text-muted);">
          <i class="fas fa-clipboard-check" style="font-size: 28px; margin-bottom: 8px; color: #10b981;"></i>
          <p>All maintenance arrangements are up to date!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = tasks.map(t => {
      const priorityClass = t.priority === 'Urgent' ? 'task-priority-urgent' : (t.priority === 'High' ? 'task-priority-high' : 'task-priority-medium');
      return `
        <div class="task-item" id="dash-task-${t.id}">
          <input type="checkbox" class="task-checkbox" data-id="${t.id}" onchange="DashboardModule.completeTask(${t.id})">
          <div class="task-content">
            <div class="task-title">${t.title}</div>
            <div class="task-meta">
              <span class="${priorityClass}"><i class="fas fa-flag"></i> ${t.priority} Priority</span>
              <span><i class="fas fa-user-cog"></i> ${t.assigned_to || 'Maintenance Team'}</span>
              <span><i class="far fa-clock"></i> Due: ${t.due_date || 'Today'}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  async completeTask(taskId) {
    try {
      await API.updateTaskStatus(taskId, 'Completed');
      App.toast('Maintenance arrangement marked as completed!', 'success');
      const taskEl = document.getElementById(`dash-task-${taskId}`);
      if (taskEl) {
        taskEl.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        taskEl.style.opacity = '0';
        taskEl.style.transform = 'translateX(20px)';
        setTimeout(() => taskEl.remove(), 300);
      }
      // Update pending count
      const pendingTasksEl = document.getElementById('stat-pending-tasks');
      if (pendingTasksEl) {
        let val = parseInt(pendingTasksEl.textContent) || 1;
        pendingTasksEl.textContent = Math.max(0, val - 1);
      }
    } catch (e) {
      App.toast('Failed to update task status', 'error');
    }
  },

  renderBiometricAudit(logs = []) {
    const container = document.getElementById('dash-biometric-audit');
    if (!container) return;

    if (logs.length === 0) {
      container.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No biometric device events recorded today.</td></tr>`;
      return;
    }

    container.innerHTML = logs.map(l => `
      <tr>
        <td>
          <span style="font-weight: 600; color: var(--secondary-navy);">${l.staff_name || l.staff_id}</span>
          <div style="font-size: 11px; color: var(--text-muted);">${l.staff_id} • ${l.department || 'Staff'}</div>
        </td>
        <td>
          <span class="badge badge-biometric">
            <i class="fas fa-fingerprint"></i> ${l.device_id}
          </span>
        </td>
        <td>
          <span class="badge ${l.punch_type === 'CHECK_IN' ? 'badge-present' : 'badge-pending'}">
            ${l.punch_type === 'CHECK_IN' ? 'Check In' : 'Check Out'}
          </span>
        </td>
        <td style="font-size: 12px;">${l.punch_time.split(' ').slice(-2).join(' ')}</td>
        <td>
          <span style="font-size: 11.5px; color: #059669; font-weight: 600;">
            <i class="fas fa-shield-alt"></i> ${l.confidence_score || 99.4}%
          </span>
        </td>
      </tr>
    `).join('');
  }
};
