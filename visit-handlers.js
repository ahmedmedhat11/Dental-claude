/**
 * Visit Management Handlers
 * Handles CRUD operations for patient visits with financial tracking
 */

/**
 * Generate sequential invoice number
 */
function generateInvoiceNumber(db) {
  // Get prefix from settings
  const prefix = db.prepare(`
    SELECT setting_value FROM settings WHERE setting_key = ?
  `).get('invoice_prefix');
  
  const invoicePrefix = prefix?.setting_value || 'INV';
  
  // Get last invoice number
  const lastInvoice = db.prepare(`
    SELECT invoice_number FROM invoices 
    ORDER BY id DESC LIMIT 1
  `).get();
  
  let nextNumber = 1;
  
  if (lastInvoice) {
    // Extract number from last invoice (e.g., "INV-0005" -> 5)
    const match = lastInvoice.invoice_number.match(/(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }
  
  // Format with leading zeros (e.g., "INV-0001")
  return `${invoicePrefix}-${nextNumber.toString().padStart(4, '0')}`;
}

module.exports = function(ipcMain, getDatabase) {
  console.log('✅ Visit management handlers loaded');
  
  /**
   * CREATE VISIT
   * Creates a new visit with optional invoice generation
   */
  ipcMain.handle('visits:create', async (event, visitData) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      const session = global.requireAuth();
      
      // Validate required fields
      if (!visitData.patient_id) {
        return { success: false, message: 'Patient ID is required' };
      }
      
      // Validate patient exists
      const patient = db.prepare(`
        SELECT * FROM patients WHERE id = ?
      `).get(visitData.patient_id);
      
      if (!patient) {
        return { success: false, message: 'Patient not found' };
      }
      
      // Validate financial data
      const totalCost = parseFloat(visitData.total_cost || 0);
      const discount = parseFloat(visitData.discount || 0);
      const amountPaid = parseFloat(visitData.amount_paid || 0);
      
      if (totalCost < 0) {
        return { success: false, message: 'Total cost cannot be negative' };
      }
      
      if (discount < 0 || discount > 100) {
        return { success: false, message: 'Discount must be between 0 and 100%' };
      }
      
      if (amountPaid < 0) {
        return { success: false, message: 'Amount paid cannot be negative' };
      }
      
      // Calculate net amount after discount
      const netAmount = totalCost - (totalCost * discount / 100);
      
      if (amountPaid > netAmount) {
        return { 
          success: false, 
          message: `Amount paid (${amountPaid}) cannot exceed net amount (${netAmount})` 
        };
      }
      
      // Start transaction
      const transaction = db.transaction(() => {
        // Insert visit
        const visitResult = db.prepare(`
          INSERT INTO visits (
            patient_id, visit_date, complaint, diagnosis, treatment,
            tooth_number, total_cost, discount, amount_paid, notes, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          visitData.patient_id,
          visitData.visit_date || null,
          visitData.complaint || null,
          visitData.diagnosis || null,
          visitData.treatment || null,
          visitData.tooth_number || null,
          totalCost,
          discount,
          amountPaid,
          visitData.notes || null,
          session.userId
        );
        
        const visitId = visitResult.lastInsertRowid;
        
        // Create invoice if there's a cost
        let invoiceId = null;
        let invoiceNumber = null;
        
        if (totalCost > 0) {
          invoiceNumber = generateInvoiceNumber(db);
          const discountAmount = totalCost * discount / 100;
          
          const invoiceResult = db.prepare(`
            INSERT INTO invoices (
              invoice_number, patient_id, visit_id, total_amount,
              discount_amount, net_amount, amount_paid, payment_method,
              notes, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            invoiceNumber,
            visitData.patient_id,
            visitId,
            totalCost,
            discountAmount,
            netAmount,
            amountPaid,
            visitData.payment_method || null,
            visitData.invoice_notes || null,
            session.userId
          );
          
          invoiceId = invoiceResult.lastInsertRowid;
        }
        
        // Create audit log
        global.createAuditLog(
          db,
          session.userId,
          'CREATE',
          'visits',
          visitId,
          null,
          {
            patient_id: visitData.patient_id,
            total_cost: totalCost,
            discount: discount,
            amount_paid: amountPaid,
            invoice_number: invoiceNumber
          }
        );
        
        return { visitId, invoiceId, invoiceNumber };
      });
      
      const result = transaction();
      
      console.log(`✅ Visit created for patient ${patient.name} (Visit ID: ${result.visitId})`);
      if (result.invoiceNumber) {
        console.log(`   Invoice generated: ${result.invoiceNumber}`);
      }
      
      return {
        success: true,
        visitId: result.visitId,
        invoiceId: result.invoiceId,
        invoiceNumber: result.invoiceNumber,
        message: 'Visit created successfully'
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Create visit error:', error);
      return {
        success: false,
        message: 'Failed to create visit: ' + error.message
      };
    }
  });
  
  /**
   * GET VISITS BY PATIENT
   * Retrieves all visits for a specific patient
   */
  ipcMain.handle('visits:getByPatient', async (event, patientId) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      global.requireAuth();
      
      if (!patientId) {
        return { success: false, message: 'Patient ID is required' };
      }
      
      const visits = db.prepare(`
        SELECT 
          v.*,
          u.full_name as created_by_name,
          i.invoice_number,
          i.payment_method,
          (SELECT COUNT(*) FROM medications WHERE visit_id = v.id) as medication_count
        FROM visits v
        LEFT JOIN users u ON v.created_by = u.id
        LEFT JOIN invoices i ON i.visit_id = v.id
        WHERE v.patient_id = ?
        ORDER BY v.visit_date DESC, v.created_at DESC
      `).all(patientId);
      
      return {
        success: true,
        visits: visits,
        count: visits.length
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Get visits by patient error:', error);
      return {
        success: false,
        message: 'Failed to retrieve visits'
      };
    }
  });
  
  /**
   * GET VISIT BY ID
   * Retrieves detailed visit information including medications
   */
  ipcMain.handle('visits:getById', async (event, visitId) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      global.requireAuth();
      
      if (!visitId) {
        return { success: false, message: 'Visit ID is required' };
      }
      
      // Get visit
      const visit = db.prepare(`
        SELECT 
          v.*,
          u.full_name as created_by_name,
          p.name as patient_name,
          p.phone as patient_phone,
          p.age as patient_age,
          p.gender as patient_gender,
          i.invoice_number,
          i.payment_method,
          i.id as invoice_id
        FROM visits v
        LEFT JOIN users u ON v.created_by = u.id
        LEFT JOIN patients p ON v.patient_id = p.id
        LEFT JOIN invoices i ON i.visit_id = v.id
        WHERE v.id = ?
      `).get(visitId);
      
      if (!visit) {
        return { success: false, message: 'Visit not found' };
      }
      
      // Get medications
      const medications = db.prepare(`
        SELECT * FROM medications
        WHERE visit_id = ?
        ORDER BY created_at
      `).all(visitId);
      
      return {
        success: true,
        visit: visit,
        medications: medications
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Get visit by ID error:', error);
      return {
        success: false,
        message: 'Failed to retrieve visit'
      };
    }
  });
  
  /**
   * UPDATE VISIT
   * Updates visit information (financial changes require higher permission)
   */
  ipcMain.handle('visits:update', async (event, visitId, visitData) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      const session = global.requireAuth();
      
      if (!visitId) {
        return { success: false, message: 'Visit ID is required' };
      }
      
      // Get existing visit
      const existingVisit = db.prepare(`
        SELECT * FROM visits WHERE id = ?
      `).get(visitId);
      
      if (!existingVisit) {
        return { success: false, message: 'Visit not found' };
      }
      
      // Check if updating financial data (requires Doctor or Admin)
      const isFinancialUpdate = 
        visitData.total_cost !== undefined || 
        visitData.discount !== undefined || 
        visitData.amount_paid !== undefined;
      
      if (isFinancialUpdate) {
        global.requireRole('Doctor');
      }
      
      // Build update query
      const updates = [];
      const values = [];
      
      if (visitData.complaint !== undefined) {
        updates.push('complaint = ?');
        values.push(visitData.complaint || null);
      }
      
      if (visitData.diagnosis !== undefined) {
        updates.push('diagnosis = ?');
        values.push(visitData.diagnosis || null);
      }
      
      if (visitData.treatment !== undefined) {
        updates.push('treatment = ?');
        values.push(visitData.treatment || null);
      }
      
      if (visitData.tooth_number !== undefined) {
        updates.push('tooth_number = ?');
        values.push(visitData.tooth_number || null);
      }
      
      if (visitData.notes !== undefined) {
        updates.push('notes = ?');
        values.push(visitData.notes || null);
      }
      
      if (visitData.total_cost !== undefined) {
        const cost = parseFloat(visitData.total_cost);
        if (cost < 0) {
          return { success: false, message: 'Total cost cannot be negative' };
        }
        updates.push('total_cost = ?');
        values.push(cost);
      }
      
      if (visitData.discount !== undefined) {
        const discount = parseFloat(visitData.discount);
        if (discount < 0 || discount > 100) {
          return { success: false, message: 'Discount must be between 0 and 100%' };
        }
        updates.push('discount = ?');
        values.push(discount);
      }
      
      if (updates.length === 0) {
        return { success: false, message: 'No fields to update' };
      }
      
      // Add updated_at
      updates.push(`updated_at = datetime('now', 'localtime')`);
      
      // Update visit
      values.push(visitId);
      db.prepare(`
        UPDATE visits
        SET ${updates.join(', ')}
        WHERE id = ?
      `).run(...values);
      
      // Get updated visit
      const updatedVisit = db.prepare(`
        SELECT * FROM visits WHERE id = ?
      `).get(visitId);
      
      // Create audit log for financial changes
      if (isFinancialUpdate) {
        global.createAuditLog(
          db,
          session.userId,
          'UPDATE',
          'visits',
          visitId,
          {
            total_cost: existingVisit.total_cost,
            discount: existingVisit.discount,
            amount_paid: existingVisit.amount_paid
          },
          {
            total_cost: updatedVisit.total_cost,
            discount: updatedVisit.discount,
            amount_paid: updatedVisit.amount_paid
          }
        );
      }
      
      console.log(`✅ Visit updated (ID: ${visitId})`);
      
      return {
        success: true,
        visit: updatedVisit,
        message: 'Visit updated successfully'
      };
      
    } catch (error) {
      if (error.message === 'Authentication required' || error.message.includes('requires')) {
        return { success: false, message: error.message };
      }
      console.error('Update visit error:', error);
      return {
        success: false,
        message: 'Failed to update visit'
      };
    }
  });
  
  /**
   * DELETE VISIT
   * Deletes a visit (Doctor or Admin only, no financial records can be deleted by User)
   */
  ipcMain.handle('visits:delete', async (event, visitId) => {
    const db = getDatabase();
    
    try {
      // Check authentication and permission
      const session = global.requireRole('Doctor');
      
      if (!visitId) {
        return { success: false, message: 'Visit ID is required' };
      }
      
      // Get visit
      const visit = db.prepare(`
        SELECT v.*, p.name as patient_name
        FROM visits v
        JOIN patients p ON v.patient_id = p.id
        WHERE v.id = ?
      `).get(visitId);
      
      if (!visit) {
        return { success: false, message: 'Visit not found' };
      }
      
      // Admin-only can delete visits with payments
      if (visit.amount_paid > 0 && session.role !== 'Admin') {
        return {
          success: false,
          message: 'Only Admin can delete visits with payments. Contact administrator.'
        };
      }
      
      // Create audit log before deletion
      global.createAuditLog(
        db,
        session.userId,
        'DELETE',
        'visits',
        visitId,
        {
          patient_name: visit.patient_name,
          total_cost: visit.total_cost,
          amount_paid: visit.amount_paid,
          diagnosis: visit.diagnosis
        },
        null
      );
      
      // Delete visit (CASCADE will handle medications and invoices)
      db.prepare(`DELETE FROM visits WHERE id = ?`).run(visitId);
      
      console.log(`✅ Visit deleted (ID: ${visitId})`);
      
      return {
        success: true,
        message: 'Visit deleted successfully'
      };
      
    } catch (error) {
      if (error.message === 'Authentication required' || error.message.includes('requires')) {
        return { success: false, message: error.message };
      }
      console.error('Delete visit error:', error);
      return {
        success: false,
        message: 'Failed to delete visit'
      };
    }
  });
  
  /**
   * ADD PAYMENT
   * Adds a payment to an existing visit
   */
  ipcMain.handle('visits:addPayment', async (event, visitId, paymentAmount) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      const session = global.requireAuth();
      
      if (!visitId || !paymentAmount) {
        return { success: false, message: 'Visit ID and payment amount are required' };
      }
      
      const amount = parseFloat(paymentAmount);
      
      if (amount <= 0) {
        return { success: false, message: 'Payment amount must be greater than 0' };
      }
      
      // Get visit
      const visit = db.prepare(`
        SELECT * FROM visits WHERE id = ?
      `).get(visitId);
      
      if (!visit) {
        return { success: false, message: 'Visit not found' };
      }
      
      // Calculate new total paid
      const newTotalPaid = visit.amount_paid + amount;
      const netAmount = visit.total_cost - (visit.total_cost * visit.discount / 100);
      
      if (newTotalPaid > netAmount) {
        return {
          success: false,
          message: `Payment would exceed net amount. Maximum: ${netAmount - visit.amount_paid}`
        };
      }
      
      // Update visit
      db.prepare(`
        UPDATE visits
        SET amount_paid = ?,
            updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(newTotalPaid, visitId);
      
      // Update invoice if exists
      db.prepare(`
        UPDATE invoices
        SET amount_paid = ?
        WHERE visit_id = ?
      `).run(newTotalPaid, visitId);
      
      // Create audit log
      global.createAuditLog(
        db,
        session.userId,
        'PAYMENT',
        'visits',
        visitId,
        { amount_paid: visit.amount_paid },
        { 
          amount_paid: newTotalPaid,
          payment_added: amount
        }
      );
      
      const remaining = netAmount - newTotalPaid;
      
      console.log(`✅ Payment added: ${amount} to visit ${visitId} (Remaining: ${remaining})`);
      
      return {
        success: true,
        previousPaid: visit.amount_paid,
        paymentAdded: amount,
        newTotalPaid: newTotalPaid,
        remaining: remaining,
        message: 'Payment added successfully'
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Add payment error:', error);
      return {
        success: false,
        message: 'Failed to add payment'
      };
    }
  });
  
  /**
   * GET VISITS WITH PENDING PAYMENTS
   * Returns all visits that have outstanding balance
   */
  ipcMain.handle('visits:getPendingPayments', async (event, filters = {}) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      global.requireAuth();
      
      let query = `
        SELECT 
          v.*,
          p.name as patient_name,
          p.phone as patient_phone,
          i.invoice_number
        FROM visits v
        JOIN patients p ON v.patient_id = p.id
        LEFT JOIN invoices i ON i.visit_id = v.id
        WHERE v.amount_remaining > 0
      `;
      
      const params = [];
      
      if (filters.patient_id) {
        query += ` AND v.patient_id = ?`;
        params.push(filters.patient_id);
      }
      
      query += ` ORDER BY v.visit_date DESC`;
      
      if (filters.limit) {
        query += ` LIMIT ?`;
        params.push(filters.limit);
      }
      
      const visits = db.prepare(query).all(...params);
      
      // Calculate totals
      const totalPending = visits.reduce((sum, v) => sum + v.amount_remaining, 0);
      
      return {
        success: true,
        visits: visits,
        count: visits.length,
        totalPending: totalPending
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Get pending payments error:', error);
      return {
        success: false,
        message: 'Failed to retrieve pending payments'
      };
    }
  });
};
