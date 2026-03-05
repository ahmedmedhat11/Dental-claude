// Visit Management Module
// Handles visit tracking, payments, and medications

const VisitModule = {
  currentVisits: [],
  currentPatient: null,
  
  /**
   * Initialize for a specific patient
   */
  async init(patientId) {
    this.currentPatient = patientId;
    await this.loadVisits();
    this.render();
  },
  
  /**
   * Load visits for patient
   */
  async loadVisits() {
    if (!this.currentPatient) return;
    
    showLoading();
    try {
      const result = await window.electronAPI.getVisitsByPatient(this.currentPatient);
      if (result.success) {
        this.currentVisits = result.visits;
      }
    } catch (error) {
      showAlert('error', 'Failed to load visits');
    }
    hideLoading();
  },
  
  /**
   * Render visit list
   */
  render() {
    const content = document.getElementById('dashboard-content');
    
    content.innerHTML = `
      <div style="max-width: 1400px; margin: 0 auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <div>
            <h1 style="font-size: 2rem; margin-bottom: 8px;">Visits</h1>
            <p style="color: var(--text-secondary);">Treatment history and payments</p>
          </div>
          <button onclick="VisitModule.showAddModal()" class="btn btn-primary">
            ➕ New Visit
          </button>
        </div>
        
        <div class="card">
          ${this.renderVisitTable()}
        </div>
      </div>
    `;
  },
  
  /**
   * Render visit table
   */
  renderVisitTable() {
    if (this.currentVisits.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">🏥</div>
          <div class="empty-state-title">No Visits Recorded</div>
          <p class="empty-state-text">Start recording patient visits and treatments</p>
          <button onclick="VisitModule.showAddModal()" class="btn btn-primary">Add First Visit</button>
        </div>
      `;
    }
    
    return `
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Complaint</th>
              <th>Diagnosis</th>
              <th>Treatment</th>
              <th>Cost</th>
              <th>Paid</th>
              <th>Remaining</th>
              <th>Invoice</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${this.currentVisits.map(visit => `
              <tr>
                <td>${formatDate(visit.visit_date)}</td>
                <td>${escapeHtml(visit.complaint) || '-'}</td>
                <td>${escapeHtml(visit.diagnosis) || '-'}</td>
                <td>${escapeHtml(visit.treatment) || '-'}</td>
                <td>${formatCurrency(visit.total_cost)} EGP</td>
                <td>${formatCurrency(visit.amount_paid)} EGP</td>
                <td>
                  <strong style="color: ${visit.amount_remaining > 0 ? 'var(--danger-color)' : 'var(--secondary-color)'}">
                    ${formatCurrency(visit.amount_remaining)} EGP
                  </strong>
                </td>
                <td>${visit.invoice_number || '-'}</td>
                <td>
                  <div class="table-actions">
                    <button onclick="VisitModule.viewVisit(${visit.id})" class="btn btn-sm btn-primary">View</button>
                    ${visit.amount_remaining > 0 ? 
                      `<button onclick="VisitModule.showPaymentModal(${visit.id})" class="btn btn-sm btn-secondary">Pay</button>` 
                      : ''}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },
  
  /**
   * Show add visit modal
   */
  showAddModal() {
    showModal('New Visit', `
      <form id="add-visit-form">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Visit Date</label>
            <input 
              type="date" 
              class="form-input" 
              id="visit-date"
              value="${new Date().toISOString().split('T')[0]}"
            >
          </div>
          
          <div class="form-group">
            <label class="form-label">Tooth Number</label>
            <input 
              type="text" 
              class="form-input" 
              id="visit-tooth"
              placeholder="e.g., 14, 26"
            >
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Chief Complaint</label>
          <input 
            type="text" 
            class="form-input" 
            id="visit-complaint"
            placeholder="Patient's main concern"
          >
        </div>
        
        <div class="form-group">
          <label class="form-label">Diagnosis</label>
          <input 
            type="text" 
            class="form-input" 
            id="visit-diagnosis"
            placeholder="Clinical diagnosis"
          >
        </div>
        
        <div class="form-group">
          <label class="form-label">Treatment</label>
          <textarea 
            class="form-textarea" 
            id="visit-treatment"
            placeholder="Treatment provided..."
          ></textarea>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label class="form-label required">Total Cost (EGP)</label>
            <input 
              type="number" 
              class="form-input" 
              id="visit-cost"
              min="0"
              step="0.01"
              value="0"
              onchange="VisitModule.calculateTotal()"
            >
          </div>
          
          <div class="form-group">
            <label class="form-label">Discount (%)</label>
            <input 
              type="number" 
              class="form-input" 
              id="visit-discount"
              min="0"
              max="100"
              step="0.1"
              value="0"
              onchange="VisitModule.calculateTotal()"
            >
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Amount Paid (EGP)</label>
            <input 
              type="number" 
              class="form-input" 
              id="visit-paid"
              min="0"
              step="0.01"
              value="0"
              onchange="VisitModule.calculateTotal()"
            >
          </div>
          
          <div class="form-group">
            <label class="form-label">Payment Method</label>
            <select class="form-select" id="visit-payment-method">
              <option value="">Select method</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Transfer">Transfer</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        
        <div id="visit-calculation" class="alert alert-info"></div>
        
        <div class="form-group">
          <label class="form-label">Notes</label>
          <textarea 
            class="form-textarea" 
            id="visit-notes"
            placeholder="Additional notes..."
          ></textarea>
        </div>
      </form>
    `, `
      <button onclick="closeModal()" class="btn">Cancel</button>
      <button onclick="VisitModule.saveVisit()" class="btn btn-primary">Save Visit</button>
    `);
    
    this.calculateTotal();
  },
  
  /**
   * Calculate visit total
   */
  calculateTotal() {
    const cost = parseFloat(document.getElementById('visit-cost')?.value || 0);
    const discount = parseFloat(document.getElementById('visit-discount')?.value || 0);
    const paid = parseFloat(document.getElementById('visit-paid')?.value || 0);
    
    const discountAmount = cost * (discount / 100);
    const netAmount = cost - discountAmount;
    const remaining = netAmount - paid;
    
    const calcDiv = document.getElementById('visit-calculation');
    if (calcDiv) {
      calcDiv.innerHTML = `
        <strong>Calculation:</strong><br>
        Total Cost: ${formatCurrency(cost)} EGP<br>
        Discount (${discount}%): -${formatCurrency(discountAmount)} EGP<br>
        Net Amount: ${formatCurrency(netAmount)} EGP<br>
        Amount Paid: ${formatCurrency(paid)} EGP<br>
        <strong>Remaining: ${formatCurrency(remaining)} EGP</strong>
      `;
    }
  },
  
  /**
   * Save new visit
   */
  async saveVisit() {
    const visitData = {
      patient_id: this.currentPatient,
      visit_date: document.getElementById('visit-date').value,
      tooth_number: document.getElementById('visit-tooth').value,
      complaint: document.getElementById('visit-complaint').value,
      diagnosis: document.getElementById('visit-diagnosis').value,
      treatment: document.getElementById('visit-treatment').value,
      total_cost: parseFloat(document.getElementById('visit-cost').value),
      discount: parseFloat(document.getElementById('visit-discount').value),
      amount_paid: parseFloat(document.getElementById('visit-paid').value),
      payment_method: document.getElementById('visit-payment-method').value,
      notes: document.getElementById('visit-notes').value
    };
    
    showLoading();
    try {
      const result = await window.electronAPI.createVisit(visitData);
      if (result.success) {
        showAlert('success', 'Visit saved successfully!');
        if (result.invoiceNumber) {
          showAlert('info', `Invoice generated: ${result.invoiceNumber}`);
        }
        closeModal();
        await this.loadVisits();
        this.render();
      } else {
        showAlert('error', result.message);
      }
    } catch (error) {
      showAlert('error', 'Failed to save visit');
    }
    hideLoading();
  },
  
  /**
   * View visit details
   */
  async viewVisit(visitId) {
    showLoading();
    try {
      const result = await window.electronAPI.getVisitById(visitId);
      if (result.success) {
        this.showVisitDetails(result.visit, result.medications);
      }
    } catch (error) {
      showAlert('error', 'Failed to load visit details');
    }
    hideLoading();
  },
  
  /**
   * Show visit details modal
   */
  showVisitDetails(visit, medications) {
    showModal('Visit Details', `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Patient</label>
          <input type="text" class="form-input" value="${escapeHtml(visit.patient_name)}" disabled>
        </div>
        <div class="form-group">
          <label class="form-label">Date</label>
          <input type="text" class="form-input" value="${formatDate(visit.visit_date)}" disabled>
        </div>
      </div>
      
      <div class="form-group">
        <label class="form-label">Complaint</label>
        <input type="text" class="form-input" value="${escapeHtml(visit.complaint || '')}" disabled>
      </div>
      
      <div class="form-group">
        <label class="form-label">Diagnosis</label>
        <input type="text" class="form-input" value="${escapeHtml(visit.diagnosis || '')}" disabled>
      </div>
      
      <div class="form-group">
        <label class="form-label">Treatment</label>
        <textarea class="form-textarea" disabled>${escapeHtml(visit.treatment || '')}</textarea>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Total Cost</label>
          <input type="text" class="form-input" value="${formatCurrency(visit.total_cost)} EGP" disabled>
        </div>
        <div class="form-group">
          <label class="form-label">Discount</label>
          <input type="text" class="form-input" value="${visit.discount}%" disabled>
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Amount Paid</label>
          <input type="text" class="form-input" value="${formatCurrency(visit.amount_paid)} EGP" disabled>
        </div>
        <div class="form-group">
          <label class="form-label">Remaining</label>
          <input type="text" class="form-input" value="${formatCurrency(visit.amount_remaining)} EGP" disabled style="font-weight: bold;">
        </div>
      </div>
      
      ${medications.length > 0 ? `
        <div style="margin-top: 24px;">
          <h3 style="margin-bottom: 12px;">Medications</h3>
          <table class="table">
            <thead>
              <tr>
                <th>Medication</th>
                <th>Dosage</th>
                <th>Frequency</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              ${medications.map(med => `
                <tr>
                  <td><strong>${escapeHtml(med.medication_name)}</strong></td>
                  <td>${escapeHtml(med.dosage || '-')}</td>
                  <td>${escapeHtml(med.frequency || '-')}</td>
                  <td>${escapeHtml(med.duration || '-')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
    `, `
      <button onclick="closeModal()" class="btn btn-primary">Close</button>
    `);
  },
  
  /**
   * Show payment modal
   */
  showPaymentModal(visitId) {
    const visit = this.currentVisits.find(v => v.id === visitId);
    if (!visit) return;
    
    showModal('Add Payment', `
      <div class="alert alert-info">
        <strong>Current Balance:</strong><br>
        Total: ${formatCurrency(visit.total_cost)} EGP<br>
        Already Paid: ${formatCurrency(visit.amount_paid)} EGP<br>
        <strong>Remaining: ${formatCurrency(visit.amount_remaining)} EGP</strong>
      </div>
      
      <form id="payment-form">
        <div class="form-group">
          <label class="form-label required">Payment Amount (EGP)</label>
          <input 
            type="number" 
            class="form-input" 
            id="payment-amount"
            min="0.01"
            max="${visit.amount_remaining}"
            step="0.01"
            value="${visit.amount_remaining}"
            required
          >
        </div>
      </form>
    `, `
      <button onclick="closeModal()" class="btn">Cancel</button>
      <button onclick="VisitModule.addPayment(${visitId})" class="btn btn-primary">Add Payment</button>
    `);
  },
  
  /**
   * Add payment
   */
  async addPayment(visitId) {
    const amount = parseFloat(document.getElementById('payment-amount').value);
    
    if (!amount || amount <= 0) {
      showAlert('error', 'Please enter a valid amount');
      return;
    }
    
    showLoading();
    try {
      const result = await window.electronAPI.addPayment(visitId, amount);
      if (result.success) {
        showAlert('success', `Payment of ${formatCurrency(amount)} EGP added successfully!`);
        closeModal();
        await this.loadVisits();
        this.render();
      } else {
        showAlert('error', result.message);
      }
    } catch (error) {
      showAlert('error', 'Failed to add payment');
    }
    hideLoading();
  }
};

window.VisitModule = VisitModule;
