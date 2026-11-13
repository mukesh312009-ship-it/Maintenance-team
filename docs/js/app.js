/**
 * Smart Campus Management System - Main App Controller
 */

const App = {
  currentUser: {
    name: 'Er. Suresh Patil',
    role: 'Chief Maintenance Supervisor',
    username: 'maintenance'
  },

  activeTab: 'dashboard',

  init() {
    this.bindEvents();
    this.initClock();
    this.loadUser();
    this.switchTab('dashboard');
  },

  bindEvents() {
    // Navigation menu clicks
    document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = item.getAttribute('data-tab');
        this.switchTab(tab);
        if (window.innerWidth <= 768) {
          document.querySelector('.sidebar').classList.remove('open');
        }
      });
    });

    // Mobile menu toggle
    const mobileBtn = document.getElementById('mobile-menu-btn');
    if (mobileBtn) {
      mobileBtn.addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('open');
      });
    }

    // Modal background close on click outside
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal(modal.id);
        }
      });
    });

    // Modal close buttons
    document.querySelectorAll('.modal-close-btn, [data-modal-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-backdrop');
        if (modal) {
          this.closeModal(modal.id);
        }
      });
    });

    // Header Quick Action Buttons
    const btnQuickBio = document.getElementById('btn-quick-biometric');
    if (btnQuickBio) {
      btnQuickBio.addEventListener('click', () => {
        BiometricModule.openSimulateModal();
      });
    }

    const btnQuickEvent = document.getElementById('btn-quick-event');
    if (btnQuickEvent) {
      btnQuickEvent.addEventListener('click', () => {
        EventsModule.openCreateModal();
      });
    }
  },

  async loadUser() {
    try {
      const stored = localStorage.getItem('campus_user');
      if (stored) {
        const u = JSON.parse(stored);
        this.currentUser = {
          name: u.full_name,
          role: u.designation || u.role,
          username: u.username
        };
      } else {
        const data = await API.getCurrentUser();
        if (data && data.user) {
          this.currentUser = {
            name: data.user.full_name,
            role: data.user.designation || data.user.role,
            username: data.user.username
          };
        }
      }

      const nameEl = document.getElementById('logged-user-name');
      const roleEl = document.getElementById('logged-user-role');
      const avatarEl = document.getElementById('logged-user-avatar');

      if (nameEl) nameEl.textContent = this.currentUser.name;
      if (roleEl) roleEl.textContent = this.currentUser.role;
      if (avatarEl) {
        avatarEl.textContent = this.currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
      }
    } catch (e) {
      console.warn('Using default demo user profile', e);
    }
  },

  logout() {
    localStorage.removeItem('campus_user');
    window.location.href = 'login.html';
  },

  switchTab(tabName) {
    this.activeTab = tabName;

    // Update nav links
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-tab') === tabName);
    });

    // Update views
    document.querySelectorAll('.module-view').forEach(view => {
      view.classList.toggle('active', view.id === `view-${tabName}`);
    });

    // Update page title
    const titles = {
      dashboard: { title: 'Maintenance Operations Dashboard', sub: 'Campus facility status, staff attendance overview & upcoming event resources' },
      attendance: { title: 'Staff Biometric & Manual Attendance', sub: 'Monitor check-ins, record manual overrides, and audit device sync' },
      events: { title: 'Inter-College Event Resource Planning', sub: 'Calculate chairs, tables, and equipment with 10% safety buffer' },
      calculator: { title: 'Resource Estimation Sandbox', sub: 'Interactive calculation tool for chairs, seating buffer, and logistical requirements' },
      tasks: { title: 'Maintenance Work Orders & Tasks', sub: 'Track seating arrangements, hall preparation, and technical setups' },
      biometric: { title: 'Biometric Device Gateway Hub', sub: 'Hardware terminal simulator, network devices, and API specifications' }
    };

    const header = titles[tabName] || { title: 'Smart Campus Management', sub: 'College Administration Portal' };
    const titleEl = document.getElementById('page-header-title');
    const subEl = document.getElementById('page-header-sub');
    if (titleEl) titleEl.textContent = header.title;
    if (subEl) subEl.textContent = header.sub;

    // Trigger tab-specific refresh
    if (tabName === 'dashboard' && typeof DashboardModule !== 'undefined') {
      DashboardModule.load();
    } else if (tabName === 'attendance' && typeof AttendanceModule !== 'undefined') {
      AttendanceModule.load();
    } else if (tabName === 'events' && typeof EventsModule !== 'undefined') {
      EventsModule.load();
    } else if (tabName === 'tasks' && typeof TasksModule !== 'undefined') {
      TasksModule.load();
    } else if (tabName === 'biometric' && typeof BiometricModule !== 'undefined') {
      BiometricModule.load();
    } else if (tabName === 'calculator' && typeof CalculatorModule !== 'undefined') {
      CalculatorModule.init();
    }
  },

  initClock() {
    const clockEl = document.getElementById('campus-clock');
    const updateTime = () => {
      if (clockEl) {
        const now = new Date();
        const options = { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
        clockEl.textContent = now.toLocaleDateString('en-US', options);
      }
    };
    updateTime();
    setInterval(updateTime, 1000);
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('show');
      document.body.style.overflow = 'hidden';
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('show');
      document.body.style.overflow = '';
    }
  },

  toast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    if (type === 'warning') icon = 'fa-exclamation-triangle';
    if (type === 'info') icon = 'fa-info-circle';

    toast.innerHTML = `
      <i class="fas ${icon}"></i>
      <div style="flex:1;">${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
};

window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
