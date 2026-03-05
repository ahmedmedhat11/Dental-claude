/**
 * Patient Management Handlers
 * Handles CRUD operations for patients with referral system integration
 */

/**
 * Generate unique 8-digit referral code
 */
function generateReferralCode(db) {
  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts) {
    // Generate 8-digit code
    const code = Math.floor(10000000 + Math.random() * 90000000).toString();
    
    // Check if unique
    const existing = db.prepare(`
      SELECT id FROM patients WHERE referral_code = ?
    `).get(code);
    
    if (!existing) {
      return code;
    }
    
    attempts++;
  }
  
  throw new Error('Failed to generate unique referral code');
}

/**
 * Normalize Egyptian phone number
 * Input: 01X XXX XXXX or +20 1X XXX XXXX or various formats
 * Output: 201XXXXXXXXX (13 characters)
 */
function normalizePhone(phone) {
  // Remove all non-digits
  let digits = phone.replace(/\D/g, '');
  
  // Handle different formats
  if (digits.startsWith('20')) {
    // Already has country code
    digits = digits;
  } else if (digits.startsWith('0')) {
    // Remove leading 0, add country code
    digits = '20' + digits.substring(1);
  } else if (digits.startsWith('1')) {
    // Missing 0 and country code
    digits = '20' + digits;
  }
  
  return digits;
}

/**
 * Validate Egyptian phone number
 */
function validatePhone(phone) {
  const normalized = normalizePhone(phone);
  
  // Must be exactly 13 characters: 201XXXXXXXXX
  if (normalized.length !== 13) {
    return { valid: false, message: 'Phone must be 11 digits (01XXXXXXXXX)' };
  }
  
  // Must start with 201
  if (!normalized.startsWith('201')) {
    return { valid: false, message: 'Phone must start with 01 (Egyptian format)' };
  }
  
  // Second digit after 201 must be 0, 1, 2, or 5 (Egyptian mobile operators)
  const operator = normalized.charAt(3);
  if (!['0', '1', '2', '5'].includes(operator)) {
    return { valid: false, message: 'Invalid Egyptian mobile number' };
  }
  
  return { valid: true, normalized };
}

/**
 * Validate patient name
 */
function validateName(name) {
  if (!name || name.trim().length < 3) {
    return { valid: false, message: 'Name must be at least 3 characters' };
  }
  
  if (name.trim().length > 100) {
    return { valid: false, message: 'Name must be less than 100 characters' };
  }
  
  // Only letters and spaces
  if (!/^[A-Za-z\s]+$/.test(name.trim())) {
    return { valid: false, message: 'Name must contain only letters and spaces' };
  }
  
  return { valid: true, normalized: name.trim() };
}

module.exports = function(ipcMain, getDatabase) {
  console.log('✅ Patient management handlers loaded');
  
  /**
   * CREATE PATIENT
   * Creates a new patient with optional referral code
   */
  ipcMain.handle('patients:create', async (event, patientData) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      const session = global.requireAuth();
      
      // Validate required fields
      if (!patientData.name || !patientData.phone) {
        return {
          success: false,
          message: 'Name and phone are required'
        };
      }
      
      // Validate name
      const nameValidation = validateName(patientData.name);
      if (!nameValidation.valid) {
        return { success: false, message: nameValidation.message };
      }
      
      // Validate and normalize phone
      const phoneValidation = validatePhone(patientData.phone);
      if (!phoneValidation.valid) {
        return { success: false, message: phoneValidation.message };
      }
      
      // Check if phone already exists
      const existingPhone = db.prepare(`
        SELECT id, name FROM patients WHERE phone = ?
      `).get(phoneValidation.normalized);
      
      if (existingPhone) {
        return {
          success: false,
          message: `Phone number already registered for patient: ${existingPhone.name}`
        };
      }
      
      // Validate age if provided
      if (patientData.age !== undefined && patientData.age !== null && patientData.age !== '') {
        const age = parseInt(patientData.age);
        if (isNaN(age) || age < 0 || age > 150) {
          return { success: false, message: 'Age must be between 0 and 150' };
        }
      }
      
      // Validate gender if provided
      if (patientData.gender && !['Male', 'Female'].includes(patientData.gender)) {
        return { success: false, message: 'Gender must be Male or Female' };
      }
      
      // Generate unique referral code for this patient
      const referralCode = generateReferralCode(db);
      
      // Process referral if provided
      let referralProcessed = false;
      let referrerPatient = null;
      let discountAmount = 0;
      let rewardAmount = 0;
      
      if (patientData.referred_by_code && patientData.referred_by_code.trim() !== '') {
        const referralCode = patientData.referred_by_code.trim();
        
        // Validate referral code format
        if (!/^\d{8}$/.test(referralCode)) {
          return {
            success: false,
            message: 'Referral code must be 8 digits'
          };
        }
        
        // Find referrer patient
        referrerPatient = db.prepare(`
          SELECT * FROM patients WHERE referral_code = ?
        `).get(referralCode);
        
        if (!referrerPatient) {
          return {
            success: false,
            message: 'Invalid referral code'
          };
        }
        
        // Check if referral code was already used by this phone
        const existingReferral = db.prepare(`
          SELECT id FROM patients WHERE phone = ? AND referred_by_code = ?
        `).get(phoneValidation.normalized, referralCode);
        
        if (existingReferral) {
          return {
            success: false,
            message: 'This referral code has already been used'
          };
        }
        
        // Get referral settings
        const discountSetting = db.prepare(`
          SELECT setting_value FROM settings WHERE setting_key = ?
        `).get('referral_discount_new_patient');
        
        const rewardSetting = db.prepare(`
          SELECT setting_value FROM settings WHERE setting_key = ?
        `).get('referral_reward_owner');
        
        discountAmount = parseFloat(discountSetting?.setting_value || 0);
        rewardAmount = parseFloat(rewardSetting?.setting_value || 0);
        
        referralProcessed = true;
      }
      
      // Start transaction
      const transaction = db.transaction(() => {
        // Insert patient
        const result = db.prepare(`
          INSERT INTO patients (
            name, phone, age, gender, address, medical_history,
            referral_code, referred_by_code, wallet_balance, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          nameValidation.normalized,
          phoneValidation.normalized,
          patientData.age || null,
          patientData.gender || null,
          patientData.address || null,
          patientData.medical_history || null,
          referralCode,
          patientData.referred_by_code?.trim() || null,
          0.0,
          session.userId
        );
        
        const newPatientId = result.lastInsertRowid;
        
        // If referral was used, process it
        if (referralProcessed && referrerPatient) {
          // Update referrer's wallet balance
          db.prepare(`
            UPDATE patients
            SET wallet_balance = wallet_balance + ?
            WHERE id = ?
          `).run(rewardAmount, referrerPatient.id);
          
          // Create referral tracking record
          db.prepare(`
            INSERT INTO referrals (
              referrer_patient_id, referred_patient_id,
              discount_given, reward_earned, status
            ) VALUES (?, ?, ?, ?, ?)
          `).run(
            referrerPatient.id,
            newPatientId,
            discountAmount,
            rewardAmount,
            'Active'
          );
        }
        
        // Create audit log
        global.createAuditLog(
          db,
          session.userId,
          'CREATE',
          'patients',
          newPatientId,
          null,
          {
            name: nameValidation.normalized,
            phone: phoneValidation.normalized,
            referral_code: referralCode,
            referred_by: patientData.referred_by_code || null
          }
        );
        
        return newPatientId;
      });
      
      const newPatientId = transaction();
      
      console.log(`✅ Patient created: ${nameValidation.normalized} (ID: ${newPatientId})`);
      
      if (referralProcessed) {
        console.log(`   Referral processed: ${discountAmount}% discount, ${rewardAmount} reward to ${referrerPatient.name}`);
      }
      
      return {
        success: true,
        patientId: newPatientId,
        referralCode: referralCode,
        referralProcessed: referralProcessed,
        discountAmount: referralProcessed ? discountAmount : 0,
        message: 'Patient created successfully'
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Create patient error:', error);
      return {
        success: false,
        message: 'Failed to create patient: ' + error.message
      };
    }
  });
  
  /**
   * GET ALL PATIENTS
   * Retrieves all patients with optional filters
   */
  ipcMain.handle('patients:getAll', async (event, filters = {}) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      global.requireAuth();
      
      let query = `
        SELECT 
          p.*,
          u.full_name as created_by_name,
          (SELECT COUNT(*) FROM patients WHERE referred_by_code = p.referral_code) as referral_count
        FROM patients p
        LEFT JOIN users u ON p.created_by = u.id
        WHERE 1=1
      `;
      
      const params = [];
      
      // Apply filters
      if (filters.search) {
        query += ` AND (p.name LIKE ? OR p.phone LIKE ?)`;
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm);
      }
      
      if (filters.hasReferrals) {
        query += ` AND p.referred_by_code IS NOT NULL`;
      }
      
      query += ` ORDER BY p.created_at DESC`;
      
      if (filters.limit) {
        query += ` LIMIT ?`;
        params.push(filters.limit);
      }
      
      const patients = db.prepare(query).all(...params);
      
      return {
        success: true,
        patients: patients,
        count: patients.length
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Get all patients error:', error);
      return {
        success: false,
        message: 'Failed to retrieve patients'
      };
    }
  });
  
  /**
   * GET PATIENT BY ID
   * Retrieves detailed patient information
   */
  ipcMain.handle('patients:getById', async (event, patientId) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      global.requireAuth();
      
      if (!patientId) {
        return { success: false, message: 'Patient ID is required' };
      }
      
      // Get patient
      const patient = db.prepare(`
        SELECT 
          p.*,
          u.full_name as created_by_name,
          (SELECT COUNT(*) FROM patients WHERE referred_by_code = p.referral_code) as referral_count,
          (SELECT COUNT(*) FROM visits WHERE patient_id = p.id) as visit_count
        FROM patients p
        LEFT JOIN users u ON p.created_by = u.id
        WHERE p.id = ?
      `).get(patientId);
      
      if (!patient) {
        return { success: false, message: 'Patient not found' };
      }
      
      // Get referrer info if patient was referred
      let referrer = null;
      if (patient.referred_by_code) {
        referrer = db.prepare(`
          SELECT id, name, phone, referral_code
          FROM patients
          WHERE referral_code = ?
        `).get(patient.referred_by_code);
      }
      
      // Get patients referred by this patient
      const referredPatients = db.prepare(`
        SELECT id, name, phone, created_at
        FROM patients
        WHERE referred_by_code = ?
        ORDER BY created_at DESC
      `).all(patient.referral_code);
      
      return {
        success: true,
        patient: patient,
        referrer: referrer,
        referredPatients: referredPatients
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Get patient by ID error:', error);
      return {
        success: false,
        message: 'Failed to retrieve patient'
      };
    }
  });
  
  /**
   * UPDATE PATIENT
   * Updates patient information (cannot change phone or referral codes)
   */
  ipcMain.handle('patients:update', async (event, patientId, patientData) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      const session = global.requireAuth();
      
      if (!patientId) {
        return { success: false, message: 'Patient ID is required' };
      }
      
      // Get existing patient
      const existingPatient = db.prepare(`
        SELECT * FROM patients WHERE id = ?
      `).get(patientId);
      
      if (!existingPatient) {
        return { success: false, message: 'Patient not found' };
      }
      
      // Build update query
      const updates = [];
      const values = [];
      
      if (patientData.name !== undefined) {
        const nameValidation = validateName(patientData.name);
        if (!nameValidation.valid) {
          return { success: false, message: nameValidation.message };
        }
        updates.push('name = ?');
        values.push(nameValidation.normalized);
      }
      
      if (patientData.age !== undefined) {
        if (patientData.age === null || patientData.age === '') {
          updates.push('age = NULL');
        } else {
          const age = parseInt(patientData.age);
          if (isNaN(age) || age < 0 || age > 150) {
            return { success: false, message: 'Age must be between 0 and 150' };
          }
          updates.push('age = ?');
          values.push(age);
        }
      }
      
      if (patientData.gender !== undefined) {
        if (patientData.gender === null || patientData.gender === '') {
          updates.push('gender = NULL');
        } else if (['Male', 'Female'].includes(patientData.gender)) {
          updates.push('gender = ?');
          values.push(patientData.gender);
        } else {
          return { success: false, message: 'Gender must be Male or Female' };
        }
      }
      
      if (patientData.address !== undefined) {
        updates.push('address = ?');
        values.push(patientData.address || null);
      }
      
      if (patientData.medical_history !== undefined) {
        updates.push('medical_history = ?');
        values.push(patientData.medical_history || null);
      }
      
      if (updates.length === 0) {
        return { success: false, message: 'No fields to update' };
      }
      
      // Add updated_at
      updates.push(`updated_at = datetime('now', 'localtime')`);
      
      // Update patient
      values.push(patientId);
      db.prepare(`
        UPDATE patients
        SET ${updates.join(', ')}
        WHERE id = ?
      `).run(...values);
      
      // Get updated patient
      const updatedPatient = db.prepare(`
        SELECT * FROM patients WHERE id = ?
      `).get(patientId);
      
      // Create audit log
      global.createAuditLog(
        db,
        session.userId,
        'UPDATE',
        'patients',
        patientId,
        {
          name: existingPatient.name,
          age: existingPatient.age,
          gender: existingPatient.gender
        },
        {
          name: updatedPatient.name,
          age: updatedPatient.age,
          gender: updatedPatient.gender
        }
      );
      
      console.log(`✅ Patient updated: ${updatedPatient.name} (ID: ${patientId})`);
      
      return {
        success: true,
        patient: updatedPatient,
        message: 'Patient updated successfully'
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Update patient error:', error);
      return {
        success: false,
        message: 'Failed to update patient'
      };
    }
  });
  
  /**
   * DELETE PATIENT
   * Deletes a patient (Admin or Doctor only, with safety checks)
   */
  ipcMain.handle('patients:delete', async (event, patientId) => {
    const db = getDatabase();
    
    try {
      // Check authentication and permission (Doctor or higher)
      const session = global.requireRole('Doctor');
      
      if (!patientId) {
        return { success: false, message: 'Patient ID is required' };
      }
      
      // Get patient
      const patient = db.prepare(`
        SELECT * FROM patients WHERE id = ?
      `).get(patientId);
      
      if (!patient) {
        return { success: false, message: 'Patient not found' };
      }
      
      // Check if patient has visits
      const visitCount = db.prepare(`
        SELECT COUNT(*) as count FROM visits WHERE patient_id = ?
      `).get(patientId).count;
      
      if (visitCount > 0) {
        return {
          success: false,
          message: `Cannot delete patient with ${visitCount} visit(s). Delete visits first or keep patient record.`
        };
      }
      
      // Check if patient has pending appointments
      const appointmentCount = db.prepare(`
        SELECT COUNT(*) as count FROM appointments 
        WHERE patient_id = ? AND status != 'Cancelled'
      `).get(patientId).count;
      
      if (appointmentCount > 0) {
        return {
          success: false,
          message: `Cannot delete patient with ${appointmentCount} active appointment(s). Cancel appointments first.`
        };
      }
      
      // Create audit log before deletion
      global.createAuditLog(
        db,
        session.userId,
        'DELETE',
        'patients',
        patientId,
        {
          name: patient.name,
          phone: patient.phone,
          referral_code: patient.referral_code
        },
        null
      );
      
      // Delete patient (CASCADE will handle referrals, followups, etc.)
      db.prepare(`DELETE FROM patients WHERE id = ?`).run(patientId);
      
      console.log(`✅ Patient deleted: ${patient.name} (ID: ${patientId})`);
      
      return {
        success: true,
        message: 'Patient deleted successfully'
      };
      
    } catch (error) {
      if (error.message === 'Authentication required' || error.message.includes('requires')) {
        return { success: false, message: error.message };
      }
      console.error('Delete patient error:', error);
      return {
        success: false,
        message: 'Failed to delete patient'
      };
    }
  });
  
  /**
   * SEARCH PATIENTS
   * Search patients by name or phone
   */
  ipcMain.handle('patients:search', async (event, searchTerm) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      global.requireAuth();
      
      if (!searchTerm || searchTerm.trim().length < 2) {
        return {
          success: false,
          message: 'Search term must be at least 2 characters'
        };
      }
      
      const term = `%${searchTerm}%`;
      
      const patients = db.prepare(`
        SELECT 
          p.*,
          (SELECT COUNT(*) FROM patients WHERE referred_by_code = p.referral_code) as referral_count,
          (SELECT COUNT(*) FROM visits WHERE patient_id = p.id) as visit_count
        FROM patients p
        WHERE p.name LIKE ? OR p.phone LIKE ? OR p.referral_code LIKE ?
        ORDER BY p.name
        LIMIT 50
      `).all(term, term, term);
      
      return {
        success: true,
        patients: patients,
        count: patients.length
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Search patients error:', error);
      return {
        success: false,
        message: 'Failed to search patients'
      };
    }
  });
  
  /**
   * VALIDATE REFERRAL CODE
   * Validates if a referral code exists and can be used
   */
  ipcMain.handle('patients:validateReferral', async (event, referralCode) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      global.requireAuth();
      
      if (!referralCode || referralCode.trim() === '') {
        return {
          valid: false,
          message: 'Referral code is required'
        };
      }
      
      // Validate format
      if (!/^\d{8}$/.test(referralCode.trim())) {
        return {
          valid: false,
          message: 'Referral code must be 8 digits'
        };
      }
      
      // Find patient with this referral code
      const patient = db.prepare(`
        SELECT id, name, phone, referral_code
        FROM patients
        WHERE referral_code = ?
      `).get(referralCode.trim());
      
      if (!patient) {
        return {
          valid: false,
          message: 'Invalid referral code'
        };
      }
      
      // Get referral settings
      const discountSetting = db.prepare(`
        SELECT setting_value FROM settings WHERE setting_key = ?
      `).get('referral_discount_new_patient');
      
      const rewardSetting = db.prepare(`
        SELECT setting_value FROM settings WHERE setting_key = ?
      `).get('referral_reward_owner');
      
      return {
        valid: true,
        patient: {
          id: patient.id,
          name: patient.name,
          phone: patient.phone
        },
        discount: parseFloat(discountSetting?.setting_value || 0),
        reward: parseFloat(rewardSetting?.setting_value || 0),
        message: `Valid referral code from ${patient.name}`
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { valid: false, message: error.message };
      }
      console.error('Validate referral code error:', error);
      return {
        valid: false,
        message: 'Failed to validate referral code'
      };
    }
  });
};
