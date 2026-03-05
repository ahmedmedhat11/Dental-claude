/**
 * Appointment Management Handlers
 * Handles appointment scheduling and management
 */

module.exports = function(ipcMain, getDatabase) {
  console.log('✅ Appointment management handlers loaded');
  
  /**
   * CREATE APPOINTMENT
   * Creates a new appointment with conflict detection
   */
  ipcMain.handle('appointments:create', async (event, appointmentData) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      const session = global.requireAuth();
      
      // Validate required fields
      if (!appointmentData.patient_id || !appointmentData.appointment_date || !appointmentData.appointment_time) {
        return {
          success: false,
          message: 'Patient ID, date, and time are required'
        };
      }
      
      // Verify patient exists
      const patient = db.prepare(`
        SELECT * FROM patients WHERE id = ?
      `).get(appointmentData.patient_id);
      
      if (!patient) {
        return { success: false, message: 'Patient not found' };
      }
      
      // Check for conflicting appointments
      const conflict = db.prepare(`
        SELECT id, patient_id FROM appointments
        WHERE appointment_date = ? 
        AND appointment_time = ?
        AND status != 'Cancelled'
      `).get(appointmentData.appointment_date, appointmentData.appointment_time);
      
      if (conflict) {
        return {
          success: false,
          message: 'This time slot is already booked'
        };
      }
      
      // Insert appointment
      const result = db.prepare(`
        INSERT INTO appointments (
          patient_id, appointment_date, appointment_time, duration_minutes,
          status, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        appointmentData.patient_id,
        appointmentData.appointment_date,
        appointmentData.appointment_time,
        appointmentData.duration_minutes || 30,
        appointmentData.status || 'Scheduled',
        appointmentData.notes || null,
        session.userId
      );
      
      console.log(`✅ Appointment created for ${patient.name} on ${appointmentData.appointment_date} at ${appointmentData.appointment_time}`);
      
      return {
        success: true,
        appointmentId: result.lastInsertRowid,
        message: 'Appointment created successfully'
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      
      // Handle unique constraint violation
      if (error.message.includes('UNIQUE constraint')) {
        return {
          success: false,
          message: 'This time slot is already booked'
        };
      }
      
      console.error('Create appointment error:', error);
      return {
        success: false,
        message: 'Failed to create appointment'
      };
    }
  });
  
  /**
   * GET ALL APPOINTMENTS
   * Retrieves appointments with optional filters
   */
  ipcMain.handle('appointments:getAll', async (event, filters = {}) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      global.requireAuth();
      
      let query = `
        SELECT 
          a.*,
          p.name as patient_name,
          p.phone as patient_phone,
          u.full_name as created_by_name
        FROM appointments a
        LEFT JOIN patients p ON a.patient_id = p.id
        LEFT JOIN users u ON a.created_by = u.id
        WHERE 1=1
      `;
      
      const params = [];
      
      // Date filter
      if (filters.date) {
        query += ` AND a.appointment_date = ?`;
        params.push(filters.date);
      }
      
      // Date range filter
      if (filters.start_date) {
        query += ` AND a.appointment_date >= ?`;
        params.push(filters.start_date);
      }
      
      if (filters.end_date) {
        query += ` AND a.appointment_date <= ?`;
        params.push(filters.end_date);
      }
      
      // Status filter
      if (filters.status) {
        query += ` AND a.status = ?`;
        params.push(filters.status);
      }
      
      // Patient filter
      if (filters.patient_id) {
        query += ` AND a.patient_id = ?`;
        params.push(filters.patient_id);
      }
      
      query += ` ORDER BY a.appointment_date, a.appointment_time`;
      
      if (filters.limit) {
        query += ` LIMIT ?`;
        params.push(filters.limit);
      }
      
      const appointments = db.prepare(query).all(...params);
      
      return {
        success: true,
        appointments: appointments,
        count: appointments.length
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Get all appointments error:', error);
      return {
        success: false,
        message: 'Failed to retrieve appointments'
      };
    }
  });
  
  /**
   * GET APPOINTMENT BY ID
   * Retrieves detailed appointment information
   */
  ipcMain.handle('appointments:getById', async (event, appointmentId) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      global.requireAuth();
      
      if (!appointmentId) {
        return { success: false, message: 'Appointment ID is required' };
      }
      
      const appointment = db.prepare(`
        SELECT 
          a.*,
          p.name as patient_name,
          p.phone as patient_phone,
          p.age as patient_age,
          p.gender as patient_gender,
          u.full_name as created_by_name
        FROM appointments a
        LEFT JOIN patients p ON a.patient_id = p.id
        LEFT JOIN users u ON a.created_by = u.id
        WHERE a.id = ?
      `).get(appointmentId);
      
      if (!appointment) {
        return { success: false, message: 'Appointment not found' };
      }
      
      return {
        success: true,
        appointment: appointment
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Get appointment by ID error:', error);
      return {
        success: false,
        message: 'Failed to retrieve appointment'
      };
    }
  });
  
  /**
   * UPDATE APPOINTMENT
   * Updates appointment information
   */
  ipcMain.handle('appointments:update', async (event, appointmentId, appointmentData) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      const session = global.requireAuth();
      
      if (!appointmentId) {
        return { success: false, message: 'Appointment ID is required' };
      }
      
      // Get existing appointment
      const existing = db.prepare(`
        SELECT * FROM appointments WHERE id = ?
      `).get(appointmentId);
      
      if (!existing) {
        return { success: false, message: 'Appointment not found' };
      }
      
      // Build update query
      const updates = [];
      const values = [];
      
      // Check for time/date conflicts if changing them
      if (appointmentData.appointment_date || appointmentData.appointment_time) {
        const newDate = appointmentData.appointment_date || existing.appointment_date;
        const newTime = appointmentData.appointment_time || existing.appointment_time;
        
        const conflict = db.prepare(`
          SELECT id FROM appointments
          WHERE appointment_date = ? 
          AND appointment_time = ?
          AND status != 'Cancelled'
          AND id != ?
        `).get(newDate, newTime, appointmentId);
        
        if (conflict) {
          return {
            success: false,
            message: 'This time slot is already booked'
          };
        }
      }
      
      if (appointmentData.appointment_date !== undefined) {
        updates.push('appointment_date = ?');
        values.push(appointmentData.appointment_date);
      }
      
      if (appointmentData.appointment_time !== undefined) {
        updates.push('appointment_time = ?');
        values.push(appointmentData.appointment_time);
      }
      
      if (appointmentData.duration_minutes !== undefined) {
        const duration = parseInt(appointmentData.duration_minutes);
        if (duration <= 0 || duration > 480) {
          return { success: false, message: 'Duration must be between 1 and 480 minutes' };
        }
        updates.push('duration_minutes = ?');
        values.push(duration);
      }
      
      if (appointmentData.status !== undefined) {
        const validStatuses = ['Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'No-Show'];
        if (!validStatuses.includes(appointmentData.status)) {
          return { success: false, message: 'Invalid status' };
        }
        updates.push('status = ?');
        values.push(appointmentData.status);
      }
      
      if (appointmentData.notes !== undefined) {
        updates.push('notes = ?');
        values.push(appointmentData.notes || null);
      }
      
      if (updates.length === 0) {
        return { success: false, message: 'No fields to update' };
      }
      
      // Add updated_at
      updates.push(`updated_at = datetime('now', 'localtime')`);
      
      // Update appointment
      values.push(appointmentId);
      db.prepare(`
        UPDATE appointments
        SET ${updates.join(', ')}
        WHERE id = ?
      `).run(...values);
      
      // Get updated appointment
      const updated = db.prepare(`
        SELECT * FROM appointments WHERE id = ?
      `).get(appointmentId);
      
      // Create audit log if status changed
      if (appointmentData.status && appointmentData.status !== existing.status) {
        global.createAuditLog(
          db,
          session.userId,
          'UPDATE',
          'appointments',
          appointmentId,
          { status: existing.status },
          { status: appointmentData.status }
        );
      }
      
      console.log(`✅ Appointment updated (ID: ${appointmentId})`);
      
      return {
        success: true,
        appointment: updated,
        message: 'Appointment updated successfully'
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Update appointment error:', error);
      return {
        success: false,
        message: 'Failed to update appointment'
      };
    }
  });
  
  /**
   * DELETE APPOINTMENT
   * Deletes an appointment
   */
  ipcMain.handle('appointments:delete', async (event, appointmentId) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      const session = global.requireAuth();
      
      if (!appointmentId) {
        return { success: false, message: 'Appointment ID is required' };
      }
      
      // Get appointment
      const appointment = db.prepare(`
        SELECT a.*, p.name as patient_name
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        WHERE a.id = ?
      `).get(appointmentId);
      
      if (!appointment) {
        return { success: false, message: 'Appointment not found' };
      }
      
      // Create audit log before deletion
      global.createAuditLog(
        db,
        session.userId,
        'DELETE',
        'appointments',
        appointmentId,
        {
          patient_name: appointment.patient_name,
          date: appointment.appointment_date,
          time: appointment.appointment_time,
          status: appointment.status
        },
        null
      );
      
      // Delete appointment
      db.prepare(`DELETE FROM appointments WHERE id = ?`).run(appointmentId);
      
      console.log(`✅ Appointment deleted (ID: ${appointmentId})`);
      
      return {
        success: true,
        message: 'Appointment deleted successfully'
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Delete appointment error:', error);
      return {
        success: false,
        message: 'Failed to delete appointment'
      };
    }
  });
  
  /**
   * GET TODAY'S APPOINTMENTS
   * Quick helper to get today's appointments
   */
  ipcMain.handle('appointments:getToday', async (event) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      global.requireAuth();
      
      const today = new Date().toISOString().split('T')[0];
      
      const appointments = db.prepare(`
        SELECT 
          a.*,
          p.name as patient_name,
          p.phone as patient_phone
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        WHERE a.appointment_date = ?
        AND a.status != 'Cancelled'
        ORDER BY a.appointment_time
      `).all(today);
      
      return {
        success: true,
        appointments: appointments,
        count: appointments.length,
        date: today
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Get today appointments error:', error);
      return {
        success: false,
        message: 'Failed to retrieve today\'s appointments'
      };
    }
  });
};
