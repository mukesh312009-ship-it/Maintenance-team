/**
 * Smart Campus Management System - Maintenance Tasks & Work Orders Module
 */

const TasksModule = {
  tasks: [],

  async load() {
    this.bindEvents();
    await this.fetchTasks();
  },

  bindEvents() {
    const statusFilter = document.getElementById('task-status-filter');
    if (statusFilter && !statusFilter.dataset.bound) {
      statusFilter.dataset.bound = 'true';
      statusFilter.addEventListener('change', () => this.fetchTasks());
    }

    const taskForm = document.getElementById('form-add-task');
    if (taskForm && !taskForm.dataset.bound) {
      taskForm.dataset.bound = 'true';
      taskForm.addEventListener('submit', (e) => this.handleAddTask(e));
    }
  },

  async fetchTasks() {
    try {
      const status = document.getElementById('task-status-filter')?.value || 'All';
      this.tasks = await API.getTasks({ status });
      this.renderTasksTable(this.tasks);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      App.toast('Failed to load maintenance tasks', 'error');
    }
  },

  renderTasksTable(tasks) {
    const tbody = document.getElementById('tasks-table-body');
    if (!tbody) return;

    if (tasks.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 32px; color: var(--text-muted);">
            <i class="fas fa-tasks" style="font-size: 24px; margin-bottom: 8px;"></i>
            <p>No maintenance work orders found for selected filter.</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = tasks.map(t => {
      let priorityBadge = '<span class="badge badge-dept">Medium</span>';
      if (t.priority === 'Urgent') priorityBadge = '<span class="badge badge-absent"><i class="fas fa-exclamation-triangle"></i> Urgent</span>';
      if (t.priority === 'High') priorityBadge = '<span class="badge badge-pending"><i class="fas fa-flag"></i> High</span>';

      let statusBadge = `<span class="badge badge-pending">${t.status}</span>`;
      if (t.status === 'Completed') statusBadge = `<span class="badge badge-present"><i class="fas fa-check"></i> Completed</span>`;
      if (t.status === 'In Progress') statusBadge = `<span class="badge badge-biometric"><i class="fas fa-spinner fa-spin"></i> In Progress</span>`;

      return `
        <tr>
          <td>
            <input type="checkbox" ${t.status === 'Completed' ? 'checked' : ''} onchange="TasksModule.toggleStatus(${t.id}, this.checked)">
          </td>
          <td>
            <div style="font-weight: 600; color: var(--primary-navy); ${t.status === 'Completed' ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">
              ${t.title}
            </div>
            ${t.event_name ? `<div style="font-size: 11px; color: var(--text-muted);">Linked Event: ${t.event_name} (${t.venue || ''})</div>` : ''}
          </td>
          <td><span class="badge badge-dept">${t.category}</span></td>
          <td>${priorityBadge}</td>
          <td style="font-size: 12.5px;">${t.assigned_to || 'Maintenance Team'}</td>
          <td style="font-size: 12px; color: var(--text-secondary);">${t.due_date || 'Today'}</td>
          <td>${statusBadge}</td>
        </tr>
      `;
    }).join('');
  },

  async toggleStatus(taskId, isChecked) {
    const newStatus = isChecked ? 'Completed' : 'Pending';
    try {
      await API.updateTaskStatus(taskId, newStatus);
      App.toast(`Work order marked as ${newStatus}!`, 'success');
      await this.fetchTasks();
      DashboardModule.load();
    } catch (err) {
      App.toast('Failed to update task status', 'error');
    }
  },

  openAddTaskModal() {
    document.getElementById('form-add-task').reset();
    document.getElementById('task-due-date').value = new Date().toISOString().split('T')[0];
    App.openModal('modal-add-task');
  },

  async handleAddTask(e) {
    e.preventDefault();
    const payload = {
      title: document.getElementById('task-title').value.trim(),
      category: document.getElementById('task-category').value,
      priority: document.getElementById('task-priority').value,
      assigned_to: document.getElementById('task-assigned').value.trim(),
      due_date: document.getElementById('task-due-date').value,
      notes: document.getElementById('task-notes').value.trim()
    };

    try {
      await API.createTask(payload);
      App.toast('New maintenance arrangement task created!', 'success');
      App.closeModal('modal-add-task');
      await this.fetchTasks();
      DashboardModule.load();
    } catch (err) {
      App.toast(err.message || 'Failed to create task', 'error');
    }
  }
};
