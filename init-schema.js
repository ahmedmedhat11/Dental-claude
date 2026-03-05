const bcrypt = require('bcrypt');

/**
 * Initialize database schema with all tables, indexes, and constraints
 * @param {Database} db - SQLite database instance
 */
function initSchema(db) {
  try {
    console.log('Creating database schema...');
    
    // Begin transaction for schema creation
    db.exec('BEGIN TRANSACTION');
    
    // =====================================================
    // USERS TABLE
    // =====================================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('Admin', 'Doctor', 'User')),
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        last_login TEXT
      )
    `);
    
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
    `);
    
    // =====================================================
    // PATIENTS TABLE
    // =====================================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS patients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL CHECK(length(name) >= 3 AND length(name) <= 100),
        phone TEXT NOT NULL UNIQUE CHECK(length(phone) = 13 AND phone LIKE '201%'),
        age INTEGER CHECK(age IS NULL OR (age >= 0 AND age <= 150)),
        gender TEXT CHECK(gender IS NULL OR gender IN ('Male', 'Female')),
        address TEXT,
        medical_history TEXT,
        referral_code TEXT NOT NULL UNIQUE CHECK(length(referral_code) = 8),
        referred_by_code TEXT,
        wallet_balance REAL NOT NULL DEFAULT 0.0 CHECK(wallet_balance >= 0),
        created_by INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (referred_by_code) REFERENCES patients(referral_code)
      )
    `);
    
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
      CREATE INDEX IF NOT EXISTS idx_patients_referral_code ON patients(referral_code);
      CREATE INDEX IF NOT EXISTS idx_patients_referred_by ON patients(referred_by_code);
      CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name COLLATE NOCASE);
      CREATE INDEX IF NOT EXISTS idx_patients_created_at ON patients(created_at);
    `);
    
    // =====================================================
    // VISITS TABLE
    // =====================================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        visit_date TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        complaint TEXT,
        diagnosis TEXT,
        treatment TEXT,
        tooth_number TEXT,
        total_cost REAL NOT NULL DEFAULT 0.0 CHECK(total_cost >= 0),
        discount REAL NOT NULL DEFAULT 0.0 CHECK(discount >= 0 AND discount <= 100),
        amount_paid REAL NOT NULL DEFAULT 0.0 CHECK(amount_paid >= 0),
        amount_remaining REAL GENERATED ALWAYS AS (
          ROUND(total_cost - (total_cost * discount / 100) - amount_paid, 2)
        ) STORED,
        notes TEXT,
        created_by INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id),
        CHECK(amount_paid <= (total_cost - (total_cost * discount / 100)))
      )
    `);
    
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_visits_patient ON visits(patient_id);
      CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(visit_date);
      CREATE INDEX IF NOT EXISTS idx_visits_created_by ON visits(created_by);
      CREATE INDEX IF NOT EXISTS idx_visits_remaining ON visits(amount_remaining);
    `);
    
    // =====================================================
    // MEDICATIONS TABLE
    // =====================================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS medications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        visit_id INTEGER NOT NULL,
        medication_name TEXT NOT NULL,
        dosage TEXT,
        frequency TEXT,
        duration TEXT,
        instructions TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE
      )
    `);
    
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_medications_visit ON medications(visit_id);
    `);
    
    // =====================================================
    // APPOINTMENTS TABLE
    // =====================================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        appointment_date TEXT NOT NULL,
        appointment_time TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL DEFAULT 30,
        status TEXT NOT NULL DEFAULT 'Scheduled' CHECK(status IN ('Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'No-Show')),
        notes TEXT,
        created_by INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
      CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
      CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_datetime ON appointments(appointment_date, appointment_time);
    `);
    
    // =====================================================
    // INVOICES TABLE
    // =====================================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT NOT NULL UNIQUE,
        patient_id INTEGER NOT NULL,
        visit_id INTEGER NOT NULL,
        total_amount REAL NOT NULL CHECK(total_amount >= 0),
        discount_amount REAL NOT NULL DEFAULT 0.0 CHECK(discount_amount >= 0),
        net_amount REAL NOT NULL CHECK(net_amount >= 0),
        amount_paid REAL NOT NULL DEFAULT 0.0 CHECK(amount_paid >= 0),
        payment_method TEXT CHECK(payment_method IN ('Cash', 'Card', 'Transfer', 'Other')),
        notes TEXT,
        created_by INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (patient_id) REFERENCES patients(id),
        FOREIGN KEY (visit_id) REFERENCES visits(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_visit ON invoices(visit_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
      CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(created_at);
    `);
    
    // =====================================================
    // FOLLOW-UPS TABLE
    // =====================================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS followups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        visit_id INTEGER,
        followup_date TEXT NOT NULL,
        reason TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Completed', 'Cancelled')),
        notes TEXT,
        created_by INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_followups_patient ON followups(patient_id);
      CREATE INDEX IF NOT EXISTS idx_followups_date ON followups(followup_date);
      CREATE INDEX IF NOT EXISTS idx_followups_status ON followups(status);
    `);
    
    // =====================================================
    // SETTINGS TABLE
    // =====================================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key TEXT NOT NULL UNIQUE,
        setting_value TEXT NOT NULL,
        description TEXT,
        updated_by INTEGER,
        updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (updated_by) REFERENCES users(id)
      )
    `);
    
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(setting_key);
    `);
    
    // =====================================================
    // AUDIT LOGS TABLE
    // =====================================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        table_name TEXT NOT NULL,
        record_id INTEGER,
        old_values TEXT,
        new_values TEXT,
        ip_address TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_table ON audit_logs(table_name);
      CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_logs(created_at);
    `);
    
    // =====================================================
    // REFERRALS TRACKING TABLE (Optional - for detailed tracking)
    // =====================================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS referrals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        referrer_patient_id INTEGER NOT NULL,
        referred_patient_id INTEGER NOT NULL,
        referral_date TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        discount_given REAL NOT NULL DEFAULT 0.0,
        reward_earned REAL NOT NULL DEFAULT 0.0,
        status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Redeemed', 'Expired')),
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (referrer_patient_id) REFERENCES patients(id),
        FOREIGN KEY (referred_patient_id) REFERENCES patients(id),
        UNIQUE(referrer_patient_id, referred_patient_id)
      )
    `);
    
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_patient_id);
      CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_patient_id);
      CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
    `);
    
    // =====================================================
    // INSERT DEFAULT SETTINGS
    // =====================================================
    const defaultSettings = [
      ['clinic_name', 'Dental Clinic', 'Name of the clinic'],
      ['clinic_phone', '201234567890', 'Clinic contact phone number'],
      ['clinic_address', 'Address goes here', 'Clinic physical address'],
      ['referral_discount_new_patient', '10', 'Discount percentage for new patients using referral code'],
      ['referral_reward_owner', '50', 'Reward amount added to referrer wallet'],
      ['invoice_prefix', 'INV', 'Prefix for invoice numbers'],
      ['currency_symbol', 'EGP', 'Currency symbol'],
      ['tax_rate', '0', 'Tax rate percentage'],
      ['appointment_duration_default', '30', 'Default appointment duration in minutes']
    ];
    
    const insertSetting = db.prepare(`
      INSERT OR IGNORE INTO settings (setting_key, setting_value, description)
      VALUES (?, ?, ?)
    `);
    
    defaultSettings.forEach(([key, value, desc]) => {
      insertSetting.run(key, value, desc);
    });
    
    // =====================================================
    // INSERT DEFAULT ADMIN USER
    // =====================================================
    const adminExists = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('Admin');
    
    if (adminExists.count === 0) {
      console.log('Creating default admin user...');
      const defaultPassword = 'admin123';
      const passwordHash = bcrypt.hashSync(defaultPassword, 10);
      
      db.prepare(`
        INSERT INTO users (username, password_hash, full_name, role, is_active)
        VALUES (?, ?, ?, ?, ?)
      `).run('admin', passwordHash, 'System Administrator', 'Admin', 1);
      
      console.log('Default admin created - Username: admin, Password: admin123');
      console.log('⚠️  IMPORTANT: Change the default password after first login!');
    }
    
    // Commit transaction
    db.exec('COMMIT');
    
    console.log('✅ Database schema created successfully');
    
    // Verify tables
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all();
    
    console.log('Created tables:', tables.map(t => t.name).join(', '));
    
    return true;
  } catch (error) {
    db.exec('ROLLBACK');
    console.error('❌ Failed to create database schema:', error);
    throw error;
  }
}

module.exports = initSchema;
