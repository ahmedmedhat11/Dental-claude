// Utility Functions for Dental Clinic Management System

/**
 * Show loading overlay
 */
function showLoading() {
  const existing = document.getElementById('loading-overlay');
  if (existing) return;
  
  const overlay = document.createElement('div');
  overlay.id = 'loading-overlay';
  overlay.className = 'loading-overlay';
  overlay.innerHTML = '<div class="loading-spinner"></div>';
  document.body.appendChild(overlay);
}

/**
 * Hide loading overlay
 */
function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.remove();
  }
}

/**
 * Show alert message
 */
function showAlert(type, message, duration = 5000) {
  const alertContainer = document.getElementById('alert-container') || createAlertContainer();
  
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.style.marginBottom = '8px';
  alert.style.animation = 'slideIn 0.3s ease-out';
  alert.textContent = message;
  
  alertContainer.appendChild(alert);
  
  setTimeout(() => {
    alert.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => alert.remove(), 300);
  }, duration);
}

/**
 * Create alert container
 */
function createAlertContainer() {
  const container = document.createElement('div');
  container.id = 'alert-container';
  container.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    max-width: 400px;
  `;
  document.body.appendChild(container);
  return container;
}

/**
 * Show modal dialog
 */
function showModal(title, bodyHTML, footerHTML = '') {
  closeModal(); // Close any existing modal
  
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-overlay';
  
  overlay.innerHTML = `
    <div class="modal modal-lg">
      <div class="modal-header">
        <h2 class="modal-title">${title}</h2>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div class="modal-body">
        ${bodyHTML}
      </div>
      ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });
}

/**
 * Close modal
 */
function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.remove();
  }
}

/**
 * Format phone number for display
 */
function formatPhone(phone) {
  if (!phone) return '';
  // Format 201012345678 to +20 101 234 5678
  if (phone.startsWith('201') && phone.length === 13) {
    return `+20 ${phone.substr(3, 2)} ${phone.substr(5, 3)} ${phone.substr(8)}`;
  }
  return phone;
}

/**
 * Format date for display
 */
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format datetime for display
 */
function formatDateTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format currency
 */
function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '0.00';
  return parseFloat(amount).toFixed(2);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Open WhatsApp
 */
function openWhatsApp(phone, message = '') {
  window.electronAPI.openWhatsApp(phone, message);
}

/**
 * Confirm dialog
 */
function confirm(message) {
  return window.confirm(message);
}

/**
 * Get status badge HTML
 */
function getStatusBadge(status) {
  const badges = {
    'Scheduled': 'badge-primary',
    'Confirmed': 'badge-info',
    'Completed': 'badge-success',
    'Cancelled': 'badge-danger',
    'No-Show': 'badge-warning',
    'Pending': 'badge-warning',
    'Active': 'badge-success',
    'Redeemed': 'badge-info',
    'Expired': 'badge-danger'
  };
  
  const badgeClass = badges[status] || 'badge-primary';
  return `<span class="badge ${badgeClass}">${status}</span>`;
}

/**
 * Validate Egyptian phone number
 */
function validateEgyptianPhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  
  // Must start with 01 and be 11 digits
  if (!/^01[0125][0-9]{8}$/.test(cleaned)) {
    return {
      valid: false,
      message: 'Phone must be Egyptian format: 01XXXXXXXXX'
    };
  }
  
  return { valid: true, cleaned };
}

/**
 * Validate patient name
 */
function validateName(name) {
  if (!name || name.length < 3) {
    return { valid: false, message: 'Name must be at least 3 characters' };
  }
  
  if (name.length > 100) {
    return { valid: false, message: 'Name must be less than 100 characters' };
  }
  
  if (!/^[A-Za-z\s]+$/.test(name)) {
    return { valid: false, message: 'Name must contain only letters and spaces' };
  }
  
  return { valid: true };
}

/**
 * Debounce function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Add CSS animations
 */
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes slideOut {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(100%);
    }
  }
`;
document.head.appendChild(styleSheet);
