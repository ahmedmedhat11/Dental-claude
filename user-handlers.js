/**
 * User Management Handlers
 * Handles CRUD operations for system users (Admin only)
 */

const bcrypt = require('bcrypt');

module.exports = function(ipcMain, getDatabase) {
  console.log('✅ User management handlers loaded');
  
  /**
   * CREATE USER (Admin only)
   * Creates a new user account
   */
  ipcMain.handle('users:create', async (event, userData) => {
    const db = getDatabase();
    
    try {
      // Check authentication and permission
      const session = global.requireRole('Admin');
      
      // Validate input
      if (!userData.username || !userData.password || !userData.full_name || !userData.role) {
        return {
          success: false,
          message: 'Username, password, full name, and role are required'
        };
      }
      
      // Validate username length
      if (userData.username.length < 3 || userData.username.length > 50) {
        return {
          success: false,
          message: 'Username must be between 3 and 50 characters'
        };
      }
      
      // Validate password length
      if (userData.password.length < 6) {
        return {
          success: false,
          message: 'Password must be at least 6 characters long'
        };
      }
      
      // Validate role
      const validRoles = ['Admin', 'Doctor', 'User'];
      if (!validRoles.includes(userData.role)) {
        return {
          success: false,
          message: 'Invalid role. Must be Admin, Doctor, or User'
        };
      }
      
      // Check if username already exists
      const existingUser = db.prepare(`
        SELECT id FROM users WHERE username = ? COLLATE NOCASE
      `).get(userData.username.trim());
      
      if (existingUser) {
        return {
          success: false,
          message: 'Username already exists'
        };
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, 10);
      
      // Insert user
      const result = db.prepare(`
        INSERT INTO users (username, password_hash, full_name, role, is_active)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        userData.username.trim(),
        passwordHash,
        userData.full_name.trim(),
        userData.role,
        userData.is_active !== undefined ? userData.is_active : 1
      );
      
      // Create audit log
      global.createAuditLog(
        db,
        session.userId,
        'CREATE',
        'users',
        result.lastInsertRowid,
        null,
        {
          username: userData.username,
          full_name: userData.full_name,
          role: userData.role
        }
      );
      
      console.log(`✅ User created: ${userData.username} (${userData.role})`);
      
      return {
        success: true,
        userId: result.lastInsertRowid,
        message: 'User created successfully'
      };
      
    } catch (error) {
      if (error.message === 'Authentication required' || error.message.includes('requires Admin')) {
        return { success: false, message: error.message };
      }
      console.error('Create user error:', error);
      return {
        success: false,
        message: 'Failed to create user'
      };
    }
  });
  
  /**
   * GET ALL USERS (Admin and Doctor)
   * Retrieves all users (excluding password hashes)
   */
  ipcMain.handle('users:getAll', async (event) => {
    const db = getDatabase();
    
    try {
      // Check authentication (Admin or Doctor can view users)
      const session = global.requireRole('Doctor');
      
      // Get all users
      const users = db.prepare(`
        SELECT 
          id,
          username,
          full_name,
          role,
          is_active,
          created_at,
          updated_at,
          last_login
        FROM users
        ORDER BY created_at DESC
      `).all();
      
      return {
        success: true,
        users: users
      };
      
    } catch (error) {
      if (error.message === 'Authentication required' || error.message.includes('requires')) {
        return { success: false, message: error.message };
      }
      console.error('Get all users error:', error);
      return {
        success: false,
        message: 'Failed to retrieve users'
      };
    }
  });
  
  /**
   * UPDATE USER (Admin only)
   * Updates user information
   */
  ipcMain.handle('users:update', async (event, userId, userData) => {
    const db = getDatabase();
    
    try {
      // Check authentication and permission
      const session = global.requireRole('Admin');
      
      // Validate input
      if (!userId) {
        return {
          success: false,
          message: 'User ID is required'
        };
      }
      
      // Get existing user
      const existingUser = db.prepare(`
        SELECT * FROM users WHERE id = ?
      `).get(userId);
      
      if (!existingUser) {
        return {
          success: false,
          message: 'User not found'
        };
      }
      
      // Prevent user from disabling their own account
      if (userId === session.userId && userData.is_active === 0) {
        return {
          success: false,
          message: 'Cannot disable your own account'
        };
      }
      
      // Build update query dynamically
      const updates = [];
      const values = [];
      
      if (userData.full_name !== undefined) {
        if (!userData.full_name.trim()) {
          return { success: false, message: 'Full name cannot be empty' };
        }
        updates.push('full_name = ?');
        values.push(userData.full_name.trim());
      }
      
      if (userData.role !== undefined) {
        const validRoles = ['Admin', 'Doctor', 'User'];
        if (!validRoles.includes(userData.role)) {
          return { success: false, message: 'Invalid role' };
        }
        updates.push('role = ?');
        values.push(userData.role);
      }
      
      if (userData.is_active !== undefined) {
        updates.push('is_active = ?');
        values.push(userData.is_active ? 1 : 0);
      }
      
      if (updates.length === 0) {
        return {
          success: false,
          message: 'No fields to update'
        };
      }
      
      // Add updated_at
      updates.push(`updated_at = datetime('now', 'localtime')`);
      
      // Update user
      values.push(userId);
      db.prepare(`
        UPDATE users 
        SET ${updates.join(', ')}
        WHERE id = ?
      `).run(...values);
      
      // Get updated user
      const updatedUser = db.prepare(`
        SELECT 
          id, username, full_name, role, is_active,
          created_at, updated_at, last_login
        FROM users WHERE id = ?
      `).get(userId);
      
      // Create audit log
      global.createAuditLog(
        db,
        session.userId,
        'UPDATE',
        'users',
        userId,
        {
          full_name: existingUser.full_name,
          role: existingUser.role,
          is_active: existingUser.is_active
        },
        {
          full_name: updatedUser.full_name,
          role: updatedUser.role,
          is_active: updatedUser.is_active
        }
      );
      
      console.log(`✅ User updated: ${existingUser.username}`);
      
      return {
        success: true,
        user: updatedUser,
        message: 'User updated successfully'
      };
      
    } catch (error) {
      if (error.message === 'Authentication required' || error.message.includes('requires Admin')) {
        return { success: false, message: error.message };
      }
      console.error('Update user error:', error);
      return {
        success: false,
        message: 'Failed to update user'
      };
    }
  });
  
  /**
   * DELETE USER (Admin only)
   * Deletes a user account
   */
  ipcMain.handle('users:delete', async (event, userId) => {
    const db = getDatabase();
    
    try {
      // Check authentication and permission
      const session = global.requireRole('Admin');
      
      // Validate input
      if (!userId) {
        return {
          success: false,
          message: 'User ID is required'
        };
      }
      
      // Prevent user from deleting their own account
      if (userId === session.userId) {
        return {
          success: false,
          message: 'Cannot delete your own account'
        };
      }
      
      // Get user to delete
      const user = db.prepare(`
        SELECT * FROM users WHERE id = ?
      `).get(userId);
      
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }
      
      // Check if user has created any records
      const patientCount = db.prepare(`
        SELECT COUNT(*) as count FROM patients WHERE created_by = ?
      `).get(userId).count;
      
      const visitCount = db.prepare(`
        SELECT COUNT(*) as count FROM visits WHERE created_by = ?
      `).get(userId).count;
      
      if (patientCount > 0 || visitCount > 0) {
        return {
          success: false,
          message: `Cannot delete user. They have created ${patientCount} patients and ${visitCount} visits. Consider deactivating instead.`
        };
      }
      
      // Create audit log before deletion
      global.createAuditLog(
        db,
        session.userId,
        'DELETE',
        'users',
        userId,
        {
          username: user.username,
          full_name: user.full_name,
          role: user.role
        },
        null
      );
      
      // Delete user
      db.prepare(`DELETE FROM users WHERE id = ?`).run(userId);
      
      console.log(`✅ User deleted: ${user.username}`);
      
      return {
        success: true,
        message: 'User deleted successfully'
      };
      
    } catch (error) {
      if (error.message === 'Authentication required' || error.message.includes('requires Admin')) {
        return { success: false, message: error.message };
      }
      console.error('Delete user error:', error);
      return {
        success: false,
        message: 'Failed to delete user'
      };
    }
  });
  
  /**
   * RESET PASSWORD (Admin only)
   * Resets a user's password to a new value
   */
  ipcMain.handle('users:resetPassword', async (event, userId, newPassword) => {
    const db = getDatabase();
    
    try {
      // Check authentication and permission
      const session = global.requireRole('Admin');
      
      // Validate input
      if (!userId || !newPassword) {
        return {
          success: false,
          message: 'User ID and new password are required'
        };
      }
      
      if (newPassword.length < 6) {
        return {
          success: false,
          message: 'Password must be at least 6 characters long'
        };
      }
      
      // Get user
      const user = db.prepare(`
        SELECT * FROM users WHERE id = ?
      `).get(userId);
      
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }
      
      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 10);
      
      // Update password
      db.prepare(`
        UPDATE users 
        SET password_hash = ?,
            updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(passwordHash, userId);
      
      // Create audit log
      global.createAuditLog(
        db,
        session.userId,
        'PASSWORD_RESET',
        'users',
        userId,
        null,
        { reset_by: session.username }
      );
      
      console.log(`✅ Password reset for user: ${user.username}`);
      
      return {
        success: true,
        message: 'Password reset successfully'
      };
      
    } catch (error) {
      if (error.message === 'Authentication required' || error.message.includes('requires Admin')) {
        return { success: false, message: error.message };
      }
      console.error('Reset password error:', error);
      return {
        success: false,
        message: 'Failed to reset password'
      };
    }
  });
};
