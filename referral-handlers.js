/**
 * Referral System Handlers
 * Manages referral statistics, wallet balance, and withdrawals
 */

module.exports = function(ipcMain, getDatabase) {
  console.log('✅ Referral system handlers loaded');
  
  /**
   * GET REFERRAL STATS
   * Gets referral statistics for a patient
   */
  ipcMain.handle('referrals:getStats', async (event, patientId) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      global.requireAuth();
      
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
      
      // Get referral statistics
      const stats = db.prepare(`
        SELECT
          (SELECT COUNT(*) FROM patients WHERE referred_by_code = ?) as total_referrals,
          (SELECT COUNT(*) FROM referrals WHERE referrer_patient_id = ? AND status = 'Active') as active_referrals,
          (SELECT COALESCE(SUM(reward_earned), 0) FROM referrals WHERE referrer_patient_id = ?) as total_rewards_earned,
          ? as current_wallet_balance,
          ? as referral_code
      `).get(
        patient.referral_code,
        patientId,
        patientId,
        patient.wallet_balance,
        patient.referral_code
      );
      
      // Get list of referred patients
      const referredPatients = db.prepare(`
        SELECT
          p.id,
          p.name,
          p.phone,
          p.created_at,
          r.discount_given,
          r.reward_earned,
          r.status,
          (SELECT COUNT(*) FROM visits WHERE patient_id = p.id) as visit_count
        FROM patients p
        LEFT JOIN referrals r ON r.referred_patient_id = p.id
        WHERE p.referred_by_code = ?
        ORDER BY p.created_at DESC
      `).all(patient.referral_code);
      
      // Check if this patient was referred
      let referredBy = null;
      if (patient.referred_by_code) {
        referredBy = db.prepare(`
          SELECT
            p.id,
            p.name,
            p.phone,
            p.referral_code,
            r.discount_given,
            r.referral_date
          FROM patients p
          LEFT JOIN referrals r ON r.referrer_patient_id = p.id AND r.referred_patient_id = ?
          WHERE p.referral_code = ?
        `).get(patientId, patient.referred_by_code);
      }
      
      return {
        success: true,
        stats: stats,
        referredPatients: referredPatients,
        referredBy: referredBy
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Get referral stats error:', error);
      return {
        success: false,
        message: 'Failed to retrieve referral statistics'
      };
    }
  });
  
  /**
   * GET WALLET BALANCE
   * Gets current wallet balance for a patient
   */
  ipcMain.handle('referrals:getWalletBalance', async (event, patientId) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      global.requireAuth();
      
      if (!patientId) {
        return { success: false, message: 'Patient ID is required' };
      }
      
      const patient = db.prepare(`
        SELECT 
          id,
          name,
          wallet_balance,
          referral_code,
          (SELECT COUNT(*) FROM patients WHERE referred_by_code = referral_code) as total_referrals
        FROM patients
        WHERE id = ?
      `).get(patientId);
      
      if (!patient) {
        return { success: false, message: 'Patient not found' };
      }
      
      // Get wallet transaction history (from referrals table)
      const transactions = db.prepare(`
        SELECT
          r.reward_earned as amount,
          r.referral_date as date,
          p.name as referred_patient_name,
          'Referral Reward' as type
        FROM referrals r
        JOIN patients p ON p.id = r.referred_patient_id
        WHERE r.referrer_patient_id = ?
        ORDER BY r.referral_date DESC
      `).all(patientId);
      
      return {
        success: true,
        balance: patient.wallet_balance,
        patientName: patient.name,
        totalReferrals: patient.total_referrals,
        transactions: transactions
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Get wallet balance error:', error);
      return {
        success: false,
        message: 'Failed to retrieve wallet balance'
      };
    }
  });
  
  /**
   * WITHDRAW FROM WALLET
   * Withdraws amount from patient's wallet (Admin or Doctor only)
   */
  ipcMain.handle('referrals:withdraw', async (event, patientId, amount) => {
    const db = getDatabase();
    
    try {
      // Check authentication and permission
      const session = global.requireRole('Doctor');
      
      if (!patientId || !amount) {
        return {
          success: false,
          message: 'Patient ID and amount are required'
        };
      }
      
      // Validate amount
      const withdrawAmount = parseFloat(amount);
      if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
        return {
          success: false,
          message: 'Amount must be greater than 0'
        };
      }
      
      // Get patient
      const patient = db.prepare(`
        SELECT * FROM patients WHERE id = ?
      `).get(patientId);
      
      if (!patient) {
        return { success: false, message: 'Patient not found' };
      }
      
      // Check if sufficient balance
      if (patient.wallet_balance < withdrawAmount) {
        return {
          success: false,
          message: `Insufficient balance. Available: ${patient.wallet_balance}`
        };
      }
      
      // Update wallet balance
      const newBalance = patient.wallet_balance - withdrawAmount;
      
      db.prepare(`
        UPDATE patients
        SET wallet_balance = ?,
            updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(newBalance, patientId);
      
      // Create audit log
      global.createAuditLog(
        db,
        session.userId,
        'WALLET_WITHDRAWAL',
        'patients',
        patientId,
        { wallet_balance: patient.wallet_balance },
        { 
          wallet_balance: newBalance,
          withdrawal_amount: withdrawAmount,
          withdrawn_by: session.username
        }
      );
      
      console.log(`✅ Wallet withdrawal: ${withdrawAmount} from ${patient.name} (New balance: ${newBalance})`);
      
      return {
        success: true,
        previousBalance: patient.wallet_balance,
        withdrawnAmount: withdrawAmount,
        newBalance: newBalance,
        message: 'Withdrawal successful'
      };
      
    } catch (error) {
      if (error.message === 'Authentication required' || error.message.includes('requires')) {
        return { success: false, message: error.message };
      }
      console.error('Wallet withdrawal error:', error);
      return {
        success: false,
        message: 'Failed to process withdrawal'
      };
    }
  });
  
  /**
   * GET REFERRAL LEADERBOARD
   * Gets top referrers
   */
  ipcMain.handle('referrals:getLeaderboard', async (event, limit = 10) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      global.requireAuth();
      
      const leaderboard = db.prepare(`
        SELECT
          p.id,
          p.name,
          p.referral_code,
          p.wallet_balance,
          (SELECT COUNT(*) FROM patients WHERE referred_by_code = p.referral_code) as total_referrals,
          (SELECT COALESCE(SUM(reward_earned), 0) FROM referrals WHERE referrer_patient_id = p.id) as total_rewards
        FROM patients p
        WHERE (SELECT COUNT(*) FROM patients WHERE referred_by_code = p.referral_code) > 0
        ORDER BY total_referrals DESC, total_rewards DESC
        LIMIT ?
      `).all(limit);
      
      return {
        success: true,
        leaderboard: leaderboard
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Get leaderboard error:', error);
      return {
        success: false,
        message: 'Failed to retrieve leaderboard'
      };
    }
  });
  
  /**
   * UPDATE REFERRAL STATUS
   * Updates status of a referral (Admin only)
   */
  ipcMain.handle('referrals:updateStatus', async (event, referralId, status) => {
    const db = getDatabase();
    
    try {
      // Check authentication and permission
      const session = global.requireRole('Admin');
      
      if (!referralId || !status) {
        return {
          success: false,
          message: 'Referral ID and status are required'
        };
      }
      
      // Validate status
      const validStatuses = ['Active', 'Redeemed', 'Expired'];
      if (!validStatuses.includes(status)) {
        return {
          success: false,
          message: 'Invalid status. Must be: Active, Redeemed, or Expired'
        };
      }
      
      // Get referral
      const referral = db.prepare(`
        SELECT * FROM referrals WHERE id = ?
      `).get(referralId);
      
      if (!referral) {
        return { success: false, message: 'Referral not found' };
      }
      
      // Update status
      db.prepare(`
        UPDATE referrals
        SET status = ?
        WHERE id = ?
      `).run(status, referralId);
      
      // Create audit log
      global.createAuditLog(
        db,
        session.userId,
        'UPDATE',
        'referrals',
        referralId,
        { status: referral.status },
        { status: status }
      );
      
      console.log(`✅ Referral status updated: ${referral.status} → ${status}`);
      
      return {
        success: true,
        message: 'Referral status updated successfully'
      };
      
    } catch (error) {
      if (error.message === 'Authentication required' || error.message.includes('requires')) {
        return { success: false, message: error.message };
      }
      console.error('Update referral status error:', error);
      return {
        success: false,
        message: 'Failed to update referral status'
      };
    }
  });
};
