// Main renderer process - Complete version with all modules integrated
console.log('Renderer process started');

// Application state
const appState = {
  currentUser: null,
  currentPage: 'login',
  darkMode: localStorage.getItem('darkMode') === 'true' || false
};

// Initialize application
async function initApp() {
  try {
    if (appState.darkMode) {
      document.body.classList.add('dark-mode');
    }
    
    const currentUser = await window.electronAPI.getCurrentUser();
    
    setTimeout(() => {
      const loadingScreen = document.getElementById('loading-screen');
      const mainContent = document.getElementById('main-content');
      
      if (loadingScreen && mainContent) {
        loadingScreen.style.display = 'none';
        mainContent.style.display = 'block';
      }
      
      if (currentUser) {
        appState.currentUser = currentUser;
        loadDashboard();
      } else {
        loadLoginScreen();
      }
    }, 1500);
    
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
}

// Load login screen
function loadLoginScreen() {
  const mainContent = document.getElementById('main-content');
  mainContent.innerHTML = `
    <div style="width: 100%; height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
      <div class="card" style="width: 450px; max-width: 90%;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="font-size: 4rem; margin-bottom: 16px;">🦷</div>
          <h1 style="color: #667eea; margin-bottom: 8px; font-size: 1.75rem;">Dental Clinic Manager</h1>
          <p style="color: #6b7280; font-size: 0.95rem;">Secure Login Portal</p>
        </div>
        
        <form id="login-form">
          <div class="form-group">
            <label class="form-label" for="username"><strong>Username</strong></label>
            <input type="text" class="form-input" id="username" placeholder="Enter your username" required autocomplete="username" autofocus>
          </div>
          
          <div class="form-group">
            <label class="form-label" for="password"><strong>Password</strong></label>
            <input type="password" class="form-input" id="password" placeholder="Enter your password" required autocomplete="current-password">
          </div>
          
          <div id="login-error" class="alert alert-error hidden" style="margin-bottom: 16px;">Invalid credentials</div>
          
          <button type="submit" class="btn btn-primary" id="login-btn" style="width: 100%; justify-content: center; padding: 12px 24px; font-size: 1rem;">
            <span id="login-btn-text">Login</span>
            <span id="login-spinner" class="hidden" style="width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite;"></span>
          </button>
        </form>
        
        <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <div style="background: #f9fafb; padding: 16px; border-radius: 8px; border-left: 4px solid #3b82f6;">
            <p style="font-size: 0.875rem; color: #374151; margin-bottom: 8px;"><strong>📌 Default Credentials:</strong></p>
            <p style="font-size: 0.875rem; color: #6b7280; margin-bottom: 4px;">Username: <code style="background: white; padding: 2px 6px; border-radius: 4px;">admin</code></p>
            <p style="font-size: 0.875rem; color: #6b7280;">Password: <code style="background: white; padding: 2px 6px; border-radius: 4px;">admin123</code></p>
          </div>
          <div style="margin-top: 12px; padding: 12px; background: #fef2f2; border-radius: 8px; border-left: 4px solid #ef4444;">
            <p style="font-size: 0.8rem; color: #991b1b; font-weight: 500;">⚠️ Change password after first login!</p>
          </div>
        </div>
        
        <div style="margin-top: 24px; text-align: center; color: #9ca3af; font-size: 0.8rem;">
          <p>Version 1.0.0 | © 2024</p>
        </div>
      </div>
    </div>
  `;
  
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
}

// Handle login
async function handleLogin(e) {
  e.preventDefault();
  
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const errorDiv = document.getElementById('login-error');
  const loginBtn = document.getElementById('login-btn');
  const loginBtnText = document.getElementById('login-btn-text');
  const loginSpinner = document.getElementById('login-spinner');
  
  try {
    loginBtn.disabled = true;
    loginBtnText.classList.add('hidden');
    loginSpinner.classList.remove('hidden');
    errorDiv.classList.add('hidden');
    
    const result = await window.electronAPI.login(username, password);
    
    if (result.success) {
      appState.currentUser = result.user;
      errorDiv.classList.remove('alert-error');
      errorDiv.classList.add('alert-success');
      errorDiv.textContent = 'Login successful! Loading...';
      errorDiv.classList.remove('hidden');
      
      setTimeout(() => loadDashboard(), 500);
    } else {
      errorDiv.classList.remove('alert-success');
      errorDiv.classList.add('alert-error');
      errorDiv.textContent = result.message || 'Login failed';
      errorDiv.classList.remove('hidden');
      
      loginBtn.disabled = false;
      loginBtnText.classList.remove('hidden');
      loginSpinner.classList.add('hidden');
      document.getElementById('password').value = '';
      document.getElementById('password').focus();
    }
    
  } catch (error) {
    errorDiv.classList.add('alert-error');
    errorDiv.textContent = 'Login failed: ' + error.message;
    errorDiv.classList.remove('hidden');
    loginBtn.disabled = false;
    loginBtnText.classList.remove('hidden');
    loginSpinner.classList.add('hidden');
  }
}

// Load dashboard with real stats
async function loadDashboard() {
  const user = appState.currentUser;
  const roleColor = user.role === 'Admin' ? '#ef4444' : user.role === 'Doctor' ? '#3b82f6' : '#10b981';
  
  // Load dashboard stats
  let stats = {
    totalPatients: 0,
    todayAppointments: 0,
    pendingPayments: 0,
    monthlyRevenue: 0
  };
  
  try {
    const result = await window.electronAPI.getDashboardStats();
    if (result.success) {
      stats = result.stats;
    }
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
  
  const mainContent = document.getElementById('main-content');
  
  mainContent.innerHTML = `
    <div style="display: flex; height: 100vh;">
      <!-- Sidebar -->
      <aside style="width: 260px; background: var(--bg-primary); border-right: 1px solid var(--border-color); display: flex; flex-direction: column;">
        <div style="padding: 24px; border-bottom: 1px solid var(--border-color);">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 3rem; margin-bottom: 8px;">🦷</div>
            <h2 style="font-size: 1.1rem; color: #667eea; margin: 0;">Dental Clinic</h2>
          </div>
          
          <div style="background: var(--bg-secondary); padding: 12px; border-radius: 8px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 40px; height: 40px; background: ${roleColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
                ${user.full_name.charAt(0)}
              </div>
              <div style="flex: 1; overflow: hidden;">
                <p style="font-weight: 600; font-size: 0.9rem; margin: 0; overflow: hidden; text-overflow: ellipsis;" title="${user.full_name}">
                  ${user.full_name}
                </p>
                <span style="padding: 2px 8px; background: ${roleColor}; color: white; border-radius: 12px; font-size: 0.7rem;">
                  ${user.role}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <nav style="flex: 1; padding: 16px 0; overflow-y: auto;">
          <a href="#" onclick="showPage('dashboard')" class="nav-link active" data-page="dashboard">📊 Dashboard</a>
          <a href="#" onclick="showPage('patients')" class="nav-link" data-page="patients">👥 Patients</a>
          <a href="#" onclick="showPage('appointments')" class="nav-link" data-page="appointments">📅 Appointments</a>
          <a href="#" onclick="showPage('reports')" class="nav-link" data-page="reports">📈 Reports</a>
          <a href="#" onclick="showPage('settings')" class="nav-link" data-page="settings">⚙️ Settings</a>
          ${user.role === 'Admin' ? '<a href="#" onclick="showPage(\'users\')" class="nav-link" data-page="users">👤 Users</a>' : ''}
        </nav>
        
        <div style="padding: 16px; border-top: 1px solid var(--border-color);">
          <button onclick="toggleDarkMode()" class="btn btn-outline" style="width: 100%; margin-bottom: 8px; justify-content: center;">
            ${appState.darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
          <button onclick="handleLogout()" class="btn btn-danger" style="width: 100%; justify-content: center;">
            🚪 Logout
          </button>
        </div>
      </aside>
      
      <!-- Main Content -->
      <main id="dashboard-content" style="flex: 1; overflow-y: auto; padding: 32px; background: var(--bg-secondary);">
        <div style="max-width: 1400px; margin: 0 auto;">
          <h1 style="font-size: 2rem; margin-bottom: 8px;">Welcome, ${user.full_name.split(' ')[0]}! 👋</h1>
          <p style="color: var(--text-secondary); margin-bottom: 32px;">Here's your clinic overview</p>
          
          <div class="stats-grid">
            <div class="stat-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <div class="stat-label">Total Patients</div>
              <div class="stat-value">${stats.totalPatients}</div>
              <div class="stat-subtext">Registered in system</div>
            </div>
            
            <div class="stat-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
              <div class="stat-label">Today's Appointments</div>
              <div class="stat-value">${stats.todayAppointments}</div>
              <div class="stat-subtext">${new Date().toLocaleDateString()}</div>
            </div>
            
            <div class="stat-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
              <div class="stat-label">Pending Payments</div>
              <div class="stat-value">${formatCurrency(stats.pendingPayments)}</div>
              <div class="stat-subtext">EGP outstanding</div>
            </div>
            
            <div class="stat-card" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
              <div class="stat-label">This Month</div>
              <div class="stat-value">${formatCurrency(stats.monthlyRevenue)}</div>
              <div class="stat-subtext">EGP revenue</div>
            </div>
          </div>
          
          <div class="card">
            <h2 style="margin-bottom: 16px;">🎉 System Ready!</h2>
            <p style="margin-bottom: 12px;">Your dental clinic management system is fully operational with:</p>
            <ul style="margin-left: 20px; color: var(--text-secondary);">
              <li>✅ Complete patient management with referral system</li>
              <li>✅ Visit tracking and financial management</li>
              <li>✅ Appointment scheduling</li>
              <li>✅ Automated invoice generation</li>
              <li>✅ Backup system (auto-backup on close)</li>
              <li>✅ WhatsApp integration</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  `;
  
  addNavigationStyles();
}

// Show specific page
function showPage(page, data) {
  // Update active nav link
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });
  
  const activeLink = document.querySelector(`[data-page="${page}"]`);
  if (activeLink) {
    activeLink.classList.add('active');
  }
  
  // Route to appropriate module
  switch(page) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'patients':
      if (window.PatientModule) {
        PatientModule.init();
      }
      break;
    case 'visits':
      if (window.VisitModule && data) {
        VisitModule.init(data);
      }
      break;
    case 'appointments':
      showComingSoon('Appointments');
      break;
    case 'reports':
      showComingSoon('Reports');
      break;
    case 'settings':
      showSettingsPage();
      break;
    case 'users':
      showComingSoon('User Management');
      break;
    default:
      loadDashboard();
  }
}

// Coming soon placeholder
function showComingSoon(feature) {
  const content = document.getElementById('dashboard-content');
  content.innerHTML = `
    <div style="max-width: 1400px; margin: 0 auto;">
      <div class="empty-state">
        <div class="empty-state-icon">🚧</div>
        <div class="empty-state-title">${feature} Module</div>
        <p class="empty-state-text">Feature available via console. UI coming soon!</p>
        <button onclick="showPage('dashboard')" class="btn btn-primary">Back to Dashboard</button>
      </div>
    </div>
  `;
}

// Show settings page
async function showSettingsPage() {
  showLoading();
  try {
    const result = await window.electronAPI.getSettings();
    if (result.success) {
      showSettingsForm(result.settings);
    }
  } catch (error) {
    showAlert('error', 'Failed to load settings');
  }
  hideLoading();
}

// Show settings form
function showSettingsForm(settings) {
  const content = document.getElementById('dashboard-content');
  content.innerHTML = `
    <div style="max-width: 800px; margin: 0 auto;">
      <h1 style="margin-bottom: 24px;">⚙️ System Settings</h1>
      
      <div class="card">
        <h3 style="margin-bottom: 16px;">Clinic Information</h3>
        <div class="form-group">
          <label class="form-label">Clinic Name</label>
          <input type="text" class="form-input" id="setting-clinic_name" value="${settings.clinic_name?.value || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Phone</label>
          <input type="text" class="form-input" id="setting-clinic_phone" value="${settings.clinic_phone?.value || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Address</label>
          <input type="text" class="form-input" id="setting-clinic_address" value="${settings.clinic_address?.value || ''}">
        </div>
      </div>
      
      <div class="card" style="margin-top: 24px;">
        <h3 style="margin-bottom: 16px;">Referral System</h3>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">New Patient Discount (%)</label>
            <input type="number" class="form-input" id="setting-referral_discount_new_patient" value="${settings.referral_discount_new_patient?.value || 0}" min="0" max="100">
          </div>
          <div class="form-group">
            <label class="form-label">Referrer Reward (EGP)</label>
            <input type="number" class="form-input" id="setting-referral_reward_owner" value="${settings.referral_reward_owner?.value || 0}" min="0">
          </div>
        </div>
      </div>
      
      <div style="margin-top: 24px; display: flex; gap: 12px;">
        <button onclick="saveSettings()" class="btn btn-primary">💾 Save Settings</button>
        <button onclick="showPage('dashboard')" class="btn">Cancel</button>
      </div>
    </div>
  `;
}

// Save settings
async function saveSettings() {
  const settings = {
    clinic_name: document.getElementById('setting-clinic_name').value,
    clinic_phone: document.getElementById('setting-clinic_phone').value,
    clinic_address: document.getElementById('setting-clinic_address').value,
    referral_discount_new_patient: document.getElementById('setting-referral_discount_new_patient').value,
    referral_reward_owner: document.getElementById('setting-referral_reward_owner').value
  };
  
  showLoading();
  try {
    const result = await window.electronAPI.bulkUpdateSettings(settings);
    if (result.success) {
      showAlert('success', 'Settings saved successfully!');
    } else {
      showAlert('error', result.message);
    }
  } catch (error) {
    showAlert('error', 'Failed to save settings');
  }
  hideLoading();
}

// Add navigation styles
function addNavigationStyles() {
  if (!document.getElementById('nav-styles')) {
    const style = document.createElement('style');
    style.id = 'nav-styles';
    style.textContent = `
      .nav-link {
        display: block;
        padding: 12px 20px;
        color: var(--text-secondary);
        text-decoration: none;
        border-left: 3px solid transparent;
        transition: all 150ms;
      }
      .nav-link:hover {
        background: var(--bg-secondary);
        color: var(--text-primary);
        border-left-color: #667eea;
      }
      .nav-link.active {
        background: var(--bg-secondary);
        color: #667eea;
        border-left-color: #667eea;
        font-weight: 600;
      }
    `;
    document.head.appendChild(style);
  }
}

// Toggle dark mode
function toggleDarkMode() {
  appState.darkMode = !appState.darkMode;
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', appState.darkMode);
  loadDashboard();
}

// Handle logout
async function handleLogout() {
  if (!confirm('Are you sure you want to logout?')) return;
  
  try {
    await window.electronAPI.logout();
    appState.currentUser = null;
    loadLoginScreen();
  } catch (error) {
    console.error('Logout error:', error);
  }
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Global exports
window.appState = appState;
window.showPage = showPage;
window.toggleDarkMode = toggleDarkMode;
window.handleLogout = handleLogout;
window.saveSettings = saveSettings;
