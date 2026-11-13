/**
 * Smart Campus Management System - Interactive Resource Estimation Sandbox
 */

const CalculatorModule = {
  init() {
    this.bindEvents();
    this.recalculate();
  },

  bindEvents() {
    const sInput = document.getElementById('calc-box-students');
    const fInput = document.getElementById('calc-box-staff');
    const gInput = document.getElementById('calc-box-guests');
    const bInput = document.getElementById('calc-box-buffer');

    [sInput, fInput, gInput, bInput].forEach(inp => {
      if (inp && !inp.dataset.bound) {
        inp.dataset.bound = 'true';
        inp.addEventListener('input', () => this.recalculate());
      }
    });

    // Preset buttons
    document.querySelectorAll('[data-calc-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = btn.getAttribute('data-calc-preset');
        this.applyPreset(preset);
      });
    });

    // Convert to Event Plan
    const convertBtn = document.getElementById('btn-calc-convert');
    if (convertBtn && !convertBtn.dataset.bound) {
      convertBtn.dataset.bound = 'true';
      convertBtn.addEventListener('click', () => this.convertToEvent());
    }
  },

  applyPreset(preset) {
    const s = document.getElementById('calc-box-students');
    const f = document.getElementById('calc-box-staff');
    const g = document.getElementById('calc-box-guests');
    const b = document.getElementById('calc-box-buffer');

    if (preset === 'workshop') {
      s.value = 60; f.value = 10; g.value = 5; b.value = 10;
    } else if (preset === 'symposium') {
      // Problem statement example!
      s.value = 200; f.value = 20; g.value = 30; b.value = 10;
    } else if (preset === 'hackathon') {
      s.value = 350; f.value = 35; g.value = 15; b.value = 12;
    } else if (preset === 'cultural') {
      s.value = 600; f.value = 50; g.value = 50; b.value = 10;
    }

    this.recalculate();
  },

  recalculate() {
    const students = parseInt(document.getElementById('calc-box-students')?.value) || 0;
    const staff = parseInt(document.getElementById('calc-box-staff')?.value) || 0;
    const guests = parseInt(document.getElementById('calc-box-guests')?.value) || 0;
    const buffer = parseFloat(document.getElementById('calc-box-buffer')?.value) || 10.0;

    const totalPeople = students + staff + guests;
    const extraChairs = Math.round(totalPeople * (buffer / 100));
    const totalChairs = totalPeople + extraChairs;

    const regTables = Math.max(2, Math.ceil(students / 60));
    const daisTables = 2;
    const guestTables = Math.ceil(guests / 8);
    const foodTables = Math.max(2, Math.ceil(totalPeople / 80));
    const totalTables = regTables + daisTables + guestTables + foodTables;

    const volunteers = Math.max(4, Math.ceil(students / 25) + Math.ceil(guests / 10) + 2);
    const waterDispensers = Math.max(2, Math.ceil(totalPeople / 80));

    // Update displays
    this.setText('calc-out-people', totalPeople);
    this.setText('calc-out-extra', `+${extraChairs} (${buffer}%)`);
    this.setText('calc-out-chairs', totalChairs);
    this.setText('calc-out-tables', totalTables);
    this.setText('calc-out-reg-tables', regTables);
    this.setText('calc-out-dais-tables', daisTables);
    this.setText('calc-out-guest-tables', guestTables);
    this.setText('calc-out-food-tables', foodTables);
    this.setText('calc-out-volunteers', volunteers);
    this.setText('calc-out-water', `${waterDispensers} Units`);
  },

  setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  },

  convertToEvent() {
    const students = document.getElementById('calc-box-students')?.value || 200;
    const staff = document.getElementById('calc-box-staff')?.value || 20;
    const guests = document.getElementById('calc-box-guests')?.value || 30;
    const buffer = document.getElementById('calc-box-buffer')?.value || 10;

    App.switchTab('events');
    EventsModule.openCreateModal();

    document.getElementById('event-students').value = students;
    document.getElementById('event-staff').value = staff;
    document.getElementById('event-guests').value = guests;
    document.getElementById('event-buffer').value = buffer;
    EventsModule.recalculateFormPreview();

    App.toast('Calculator values loaded into Event Plan!', 'info');
  }
};
