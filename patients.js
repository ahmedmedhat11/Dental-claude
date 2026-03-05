// Patient Management Module
// Handles all patient-related UI interactions

const PatientModule = {
  currentPatients: [],
  currentPatient: null,
  searchTerm: '',
  
  /**
   * Initialize patient module
   */
  async init() {
    await this.loadPatients();
    this.render();
  },
  
  /**
   * Load all patients from backend
   */
  async loadPatients() {
    showLoading();
    try {
      const result = await window.electronAPI.getAllPatients();
      if (result.success) {
        this.currentPatients = result.patients;
      } else {
        showAlert('error', result.message);
      }
    } catch (error) {
      showAlert('error', 'Failed to load patients: ' + error.message);
    }
    hideLoading();
  },
  
  /**
   * Search patients
   */
  async searchPatients() {
    if (this.searchTerm.length < 2) {
      await this.loadPatients();
      return;
    }
    
    showLoading();
    try {
      const result = await window.electronAPI.searchPatients(this.searchTerm);
      if (result.success) {
        this.currentPatients = result.patients;
        this.render();
      }
    } catch (error) {
      showAlert('error', 'Search failed: ' + error.message);
    }
    hideLoading();
  },
  
  /**
   * Render patient list
   */
  render() {
    const content = document.getElementById('dashboard-content');
    
    content.innerHTML = `
      <div style="max-width: 1400px; margin: 0 auto;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <div>
            <h1 style="font-size: 2rem; margin-bottom: 8px;">Patients</h1>
            <p style="color: var(--text-secondary);">Manage patient records and referrals</p>
          </div>
          <button onclick="PatientModule.showAddModal()" class="btn btn-primary">
            ➕ Add Patient
          </button>
        </div>
        
        <!-- Search Bar -->
        <div class="card" style="margin-bottom: 24px;">
          <div class="search-bar" style="max-width: 100%;">
            <span class="search-icon">🔍</span>
            <input 
              type="text" 
              class="search-input" 
              placeholder="Search by name, phone, or referral code..."
              id="patient-search"
              value="${this.searchTerm}"
            >
          </div>
        </div>
        
        <!-- Patient Table -->
        <div class="card">
          <div class="table-container">
            ${this.renderTable()}
          </div>
        </div>
      </div>
    `;
    
    // Attach event listeners
    const searchInput = document.getElementById('patient-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value;
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => this.searchPatients(), 300);
      });
    }
  },
  
  /**
   * Render patient table
   */
  renderTable() {
    if (this.currentPatients.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">👥</div>
          <div class="empty-state-title">No Patients Found</div>
          <p class="empty-state-text">
            ${this.searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first patient'}
          </p>
          ${!this.searchTerm ? '<button onclick="PatientModule.showAddModal()" class="btn btn-primary">Add First Patient</button>' : ''}
        </div>
      `;
    }
    
    return `
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Age</th>
            <th>Gender</th>
            <th>Referral Code</th>
            <th>Referrals</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${this.currentPatients.map(patient => `
            <tr>
              <td><strong>${escapeHtml(patient.name)}</strong></td>
              <td>
                ${formatPhone(patient.phone)}
                <button 
                  onclick="openWhatsApp('${patient.phone}')" 
                  class="btn btn-sm" 
                  style="margin-left: 8px; padding: 4px 8px;"
                  title="Open WhatsApp"
                >📱</button>
              </td>
              <td>${patient.age || '-'}</td>
              <td>${patient.gender || '-'}</td>
              <td>
                <code style="background: var(--bg-tertiary); padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                  ${patient.referral_code}
                </code>
                <button 
                  onclick="PatientModule.copyReferralCode('${patient.referral_code}')" 
                  class="btn btn-sm"
                  style="margin-left: 4px; padding: 4px 8px;"
                  title="Copy code"
                >📋</button>
              </td>
              <td>
                <span class="badge badge-primary">${patient.referral_count || 0}</span>
              </td>
              <td>${formatDate(patient.created_at)}</td>
              <td>
                <div class="table-actions">
                  <button onclick="PatientModule.viewPatient(${patient.id})" class="btn btn-sm btn-primary">View</button>
                  <button onclick="PatientModule.showEditModal(${patient.id})" class="btn btn-sm">Edit</button>
                  <button onclick="PatientModule.deletePatient(${patient.id})" class="btn btn-sm btn-danger">Delete</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  },
  
  /**
   * Show add patient modal
   */
  showAddModal() {
    showModal('Add New Patient', `
      <form id="add-patient-form">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label required">Patient Name</label>
            <input 
              type="text" 
              class="form-input" 
              id="patient-name" 
              placeholder="Full name (letters only)"
              required
              pattern="[A-Za-z\\s]{3,100}"
            >
            <div class="form-error" id="name-error"></div>
          </div>
          
          <div class="form-group">
            <label class="form-label required">Phone Number</label>
            <input 
              type="text" 
              class="form-input" 
              id="patient-phone" 
              placeholder="01XXXXXXXXX"
              required
              pattern="01[0125][0-9]{8}"
            >
            <div class="form-error" id="phone-error"></div>
            <small style="color: var(--text-muted);">Egyptian format: 01XXXXXXXXX</small>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Age</label>
            <input 
              type="number" 
              class="form-input" 
              id="patient-age" 
              placeholder="Age"
              min="0"
              max="150"
            >
          </div>
          
          <div class="form-group">
            <label class="form-label">Gender</label>
            <select class="form-select" id="patient-gender">
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Address</label>
          <input 
            type="text" 
            class="form-input" 
            id="patient-address" 
            placeholder="Patient address"
          >
        </div>
        
        <div class="form-group">
          <label class="form-label">Medical History</label>
          <textarea 
            class="form-textarea" 
            id="patient-history" 
            placeholder="Allergies, chronic conditions, previous treatments..."
          ></textarea>
        </div>
        
        <div class="form-group">
          <label class="form-label">Referred By (Optional)</label>
          <input 
            type="text" 
            class="form-input" 
            id="patient-referral" 
            placeholder="8-digit referral code"
            pattern="[0-9]{8}"
            maxlength="8"
          >
          <div class="form-error" id="referral-error"></div>
          <div id="referral-info"></div>
        </div>
      </form>
    `, `
      <button onclick="closeModal()" class="btn">Cancel</button>
      <button onclick="PatientModule.savePatient()" class="btn btn-primary">Add Patient</button>
    `);
    
    // Add referral code validation
    const referralInput = document.getElementById('patient-referral');
    if (referralInput) {
      referralInput.addEventListener('input', async (e) => {
        const code = e.target.value;
        const errorDiv = document.getElementById('referral-error');
        const infoDiv = document.getElementById('referral-info');
        
        if (code.length === 8) {
          try {
            const result = await window.electronAPI.validateReferralCode(code);
            if (result.valid) {
              errorDiv.textContent = '';
              infoDiv.innerHTML = `
                <div class="alert alert-success" style="margin-top: 8px;">
                  ✅ Valid referral from <strong>${result.patient.name}</strong><br>
                  Discount: ${result.discount}% | Reward: ${result.reward} EGP
                </div>
              `;
            } else {
              errorDiv.textContent = result.message;
              infoDiv.innerHTML = '';
            }
          } catch (error) {
            errorDiv.textContent = 'Validation failed';
            infoDiv.innerHTML = '';
          }
        } else {
          errorDiv.textContent = '';
          infoDiv.innerHTML = '';
        }
      });
    }
  },
  
  /**
   * Save new patient
   */
  async savePatient() {
    const name = document.getElementById('patient-name').value.trim();
    const phone = document.getElementById('patient-phone').value.trim();
    const age = document.getElementById('patient-age').value;
    const gender = document.getElementById('patient-gender').value;
    const address = document.getElementById('patient-address').value.trim();
    const history = document.getElementById('patient-history').value.trim();
    const referralCode = document.getElementById('patient-referral').value.trim();
    
    // Validate
    if (!name || !phone) {
      showAlert('error', 'Name and phone are required');
      return;
    }
    
    showLoading();
    try {
      const result = await window.electronAPI.createPatient({
        name,
        phone,
        age: age || null,
        gender: gender || null,
        address: address || null,
        medical_history: history || null,
        referred_by_code: referralCode || null
      });
      
      if (result.success) {
        showAlert('success', 'Patient added successfully!');
        if (result.referralProcessed) {
          showAlert('info', `Referral processed: ${result.discountAmount}% discount applied`);
        }
        closeModal();
        await this.loadPatients();
        this.render();
      } else {
        showAlert('error', result.message);
      }
    } catch (error) {
      showAlert('error', 'Failed to add patient: ' + error.message);
    }
    hideLoading();
  },
  
  /**
   * Show edit patient modal
   */
  async showEditModal(patientId) {
    showLoading();
    try {
      const result = await window.electronAPI.getPatientById(patientId);
      if (!result.success) {
        showAlert('error', result.message);
        hideLoading();
        return;
      }
      
      const patient = result.patient;
      
      showModal('Edit Patient', `
        <form id="edit-patient-form">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label required">Patient Name</label>
              <input 
                type="text" 
                class="form-input" 
                id="edit-patient-name" 
                value="${escapeHtml(patient.name)}"
                required
              >
            </div>
            
            <div class="form-group">
              <label class="form-label">Phone Number</label>
              <input 
                type="text" 
                class="form-input" 
                value="${formatPhone(patient.phone)}"
                disabled
              >
              <small style="color: var(--text-muted);">Phone cannot be changed</small>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Age</label>
              <input 
                type="number" 
                class="form-input" 
                id="edit-patient-age" 
                value="${patient.age || ''}"
                min="0"
                max="150"
              >
            </div>
            
            <div class="form-group">
              <label class="form-label">Gender</label>
              <select class="form-select" id="edit-patient-gender">
                <option value="">Select gender</option>
                <option value="Male" ${patient.gender === 'Male' ? 'selected' : ''}>Male</option>
                <option value="Female" ${patient.gender === 'Female' ? 'selected' : ''}>Female</option>
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Address</label>
            <input 
              type="text" 
              class="form-input" 
              id="edit-patient-address" 
              value="${escapeHtml(patient.address || '')}"
            >
          </div>
          
          <div class="form-group">
            <label class="form-label">Medical History</label>
            <textarea 
              class="form-textarea" 
              id="edit-patient-history"
            >${escapeHtml(patient.medical_history || '')}</textarea>
          </div>
        </form>
      `, `
        <button onclick="closeModal()" class="btn">Cancel</button>
        <button onclick="PatientModule.updatePatient(${patientId})" class="btn btn-primary">Save Changes</button>
      `);
      
    } catch (error) {
      showAlert('error', 'Failed to load patient: ' + error.message);
    }
    hideLoading();
  },
  
  /**
   * Update patient
   */
  async updatePatient(patientId) {
    const name = document.getElementById('edit-patient-name').value.trim();
    const age = document.getElementById('edit-patient-age').value;
    const gender = document.getElementById('edit-patient-gender').value;
    const address = document.getElementById('edit-patient-address').value.trim();
    const history = document.getElementById('edit-patient-history').value.trim();
    
    showLoading();
    try {
      const result = await window.electronAPI.updatePatient(patientId, {
        name,
        age: age || null,
        gender: gender || null,
        address: address || null,
        medical_history: history || null
      });
      
      if (result.success) {
        showAlert('success', 'Patient updated successfully!');
        closeModal();
        await this.loadPatients();
        this.render();
      } else {
        showAlert('error', result.message);
      }
    } catch (error) {
      showAlert('error', 'Failed to update patient: ' + error.message);
    }
    hideLoading();
  },
  
  /**
   * View patient details
   */
  async viewPatient(patientId) {
    showPage('patient-profile', patientId);
  },
  
  /**
   * Delete patient
   */
  async deletePatient(patientId) {
    if (!confirm('Are you sure you want to delete this patient? This cannot be undone.')) {
      return;
    }
    
    showLoading();
    try {
      const result = await window.electronAPI.deletePatient(patientId);
      if (result.success) {
        showAlert('success', 'Patient deleted successfully');
        await this.loadPatients();
        this.render();
      } else {
        showAlert('error', result.message);
      }
    } catch (error) {
      showAlert('error', 'Failed to delete patient: ' + error.message);
    }
    hideLoading();
  },
  
  /**
   * Copy referral code
   */
  copyReferralCode(code) {
    navigator.clipboard.writeText(code).then(() => {
      showAlert('success', 'Referral code copied!');
    });
  }
};

// Export to global scope
window.PatientModule = PatientModule;
