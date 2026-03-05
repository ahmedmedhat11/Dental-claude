# 🧪 PHASE 2 TESTING GUIDE

Complete guide to test all Phase 2 authentication and user management features.

---

## 🚀 Quick Start Testing

### 1. Start the Application
```bash
cd dental-clinic-system
npm install
npm run dev
```

### 2. Wait for Login Screen
- Application should show loading screen briefly
- Then display professional login screen
- Default credentials should be visible

---

## 🔐 Authentication Tests

### Test 1: Successful Login
**Steps:**
1. Enter username: `admin`
2. Enter password: `admin123`
3. Click "Login"

**Expected:**
- ✅ Button shows spinner
- ✅ Success message appears
- ✅ Dashboard loads
- ✅ User profile shows in sidebar
- ✅ Role badge shows "Admin" in red

### Test 2: Failed Login - Wrong Password
**Steps:**
1. Enter username: `admin`
2. Enter password: `wrongpassword`
3. Click "Login"

**Expected:**
- ❌ Error message: "Invalid username or password"
- ❌ Password field clears
- ❌ Stays on login screen

### Test 3: Failed Login - Non-existent User
**Steps:**
1. Enter username: `nonexistent`
2. Enter password: `anypassword`
3. Click "Login"

**Expected:**
- ❌ Error message: "Invalid username or password"
- ❌ Stays on login screen

### Test 4: Logout
**Steps:**
1. Login successfully
2. Click "Logout" button in sidebar
3. Confirm logout

**Expected:**
- ✅ Returns to login screen
- ✅ Session cleared
- ✅ Console shows "Logged out successfully"

---

## 👤 User Management Tests (Admin Only)

### Test 5: View All Users
**Steps:**
1. Login as admin
2. Click "Users" in sidebar
3. (Note: Currently shows "coming soon" - will be Phase 6)

**Expected:**
- 📋 Admin can see Users menu item
- 📋 Others cannot see Users menu

### Test 6: Create New User (via IPC)
**Open DevTools Console (Ctrl+Shift+I) and run:**

```javascript
// Create a Doctor user
await window.electronAPI.createUser({
  username: "doctor1",
  password: "doctor123",
  full_name: "Dr. Smith",
  role: "Doctor"
})
```

**Expected:**
```javascript
{ success: true, userId: 2, message: "User created successfully" }
```

### Test 7: Create Duplicate User
**Console:**
```javascript
// Try creating same username again
await window.electronAPI.createUser({
  username: "doctor1",
  password: "anypass",
  full_name: "Another Name",
  role: "User"
})
```

**Expected:**
```javascript
{ success: false, message: "Username already exists" }
```

### Test 8: List All Users
**Console:**
```javascript
const result = await window.electronAPI.getAllUsers()
console.table(result.users)
```

**Expected:**
- Shows all users in table format
- Should see: admin, doctor1 (if created)
- Password hashes not included

### Test 9: Update User
**Console:**
```javascript
// Update doctor1's full name
await window.electronAPI.updateUser(2, {
  full_name: "Dr. John Smith",
  role: "Doctor"
})
```

**Expected:**
```javascript
{ success: true, user: {...}, message: "User updated successfully" }
```

### Test 10: Reset User Password
**Console:**
```javascript
// Reset doctor1's password
await window.electronAPI.resetPassword(2, "newpassword123")
```

**Expected:**
```javascript
{ success: true, message: "Password reset successfully" }
```

### Test 11: Login with New User
**Steps:**
1. Logout from admin
2. Login with username: `doctor1`
3. Password: `newpassword123` (or original if not reset)

**Expected:**
- ✅ Login successful
- ✅ Dashboard loads
- ✅ Role badge shows "Doctor" in blue
- ❌ No "Users" menu item (Doctor cannot manage users)

### Test 12: Attempt to Create User as Doctor
**Console (logged in as doctor1):**
```javascript
await window.electronAPI.createUser({
  username: "test",
  password: "test123",
  full_name: "Test User",
  role: "User"
})
```

**Expected:**
```javascript
{ success: false, message: "This action requires Admin role or higher" }
```

### Test 13: Delete User Protection
**Console (logged in as admin):**
```javascript
// Try to delete own account
await window.electronAPI.deleteUser(1)
```

**Expected:**
```javascript
{ success: false, message: "Cannot delete your own account" }
```

---

## 🔑 Password Management Tests

### Test 14: Change Own Password
**Console:**
```javascript
await window.electronAPI.changePassword("admin123", "newadminpass")
```

**Expected:**
- ✅ Success message
- ✅ Can login with new password
- ✅ Old password no longer works

### Test 15: Change Password - Wrong Old Password
**Console:**
```javascript
await window.electronAPI.changePassword("wrongold", "newpass")
```

**Expected:**
```javascript
{ success: false, message: "Current password is incorrect" }
```

### Test 16: Change Password - Weak New Password
**Console:**
```javascript
await window.electronAPI.changePassword("admin123", "123")
```

**Expected:**
```javascript
{ success: false, message: "New password must be at least 6 characters long" }
```

---

## 🎨 UI Feature Tests

### Test 17: Dark Mode Toggle
**Steps:**
1. Login successfully
2. Click "🌙 Dark Mode" button
3. Click again to toggle back

**Expected:**
- ✅ Background changes to dark
- ✅ Text colors adjust
- ✅ Button text changes to "☀️ Light Mode"
- ✅ Preference persists on page navigation
- ✅ Saved in localStorage

### Test 18: Navigation Menu
**Steps:**
1. Click each menu item
2. Observe the content area

**Expected:**
- ✅ Each page shows "coming soon" message
- ✅ Active link highlighted
- ✅ Can return to dashboard

### Test 19: Role Badge Display
**Steps:**
1. Login as different roles
2. Observe sidebar user info

**Expected:**
- Admin: Red badge
- Doctor: Blue badge
- User: Green badge

### Test 20: Responsive Design
**Steps:**
1. Resize window to different sizes
2. Check layout

**Expected:**
- ✅ Sidebar stays fixed width
- ✅ Content area adjusts
- ✅ No horizontal scrollbar on main content

---

## 📊 Audit Log Tests

### Test 21: Verify Audit Logs
**Using SQLite Browser:**
1. Open `database/clinic.db`
2. Browse `audit_logs` table
3. Check for entries

**Expected Records:**
- LOGIN events
- LOGOUT events
- CREATE (user creation)
- UPDATE (user updates)
- PASSWORD_CHANGE
- PASSWORD_RESET

### Test 22: Audit Log Content
**Console:**
```javascript
// This will be available when audit log UI is built
// For now, check database directly
```

**Expected in database:**
```sql
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10
```

Should show:
- user_id: Who performed action
- action: Type of action
- table_name: "users"
- old_values: JSON before state
- new_values: JSON after state
- created_at: Timestamp

---

## 🔄 Session Management Tests

### Test 23: Session Persistence
**Steps:**
1. Login successfully
2. Navigate to different pages
3. Check console

**Expected:**
- ✅ Session maintained
- ✅ User info available
- ✅ No re-authentication required

### Test 24: Session Cleared on App Restart
**Steps:**
1. Login successfully
2. Close application (File → Quit or close window)
3. Restart application

**Expected:**
- ✅ Returns to login screen
- ✅ Must login again
- ✅ Previous session not remembered

---

## 🚨 Edge Case Tests

### Test 25: Empty Login Fields
**Steps:**
1. Leave username empty
2. Click "Login"

**Expected:**
- ❌ Browser validation: "Please fill out this field"
- ❌ Form does not submit

### Test 26: Special Characters in Username
**Steps:**
1. Try creating user with special chars: `test@#$`

**Expected:**
- Should accept (username allows most characters)
- But should still be validated for length

### Test 27: Very Long Input
**Console:**
```javascript
await window.electronAPI.createUser({
  username: "a".repeat(100),  // 100 characters
  password: "test123",
  full_name: "Test",
  role: "User"
})
```

**Expected:**
```javascript
{ success: false, message: "Username must be between 3 and 50 characters" }
```

### Test 28: SQL Injection Attempt
**Console:**
```javascript
await window.electronAPI.login("admin' OR '1'='1", "anything")
```

**Expected:**
- ❌ Login fails
- ❌ No SQL error
- ❌ Safe from injection (using prepared statements)

---

## ✅ Complete Test Checklist

### Authentication:
- [ ] Login with correct credentials
- [ ] Login with wrong password
- [ ] Login with non-existent user
- [ ] Login with inactive user (create one first)
- [ ] Logout functionality
- [ ] Session persistence during use
- [ ] Session cleared on restart

### User Management (Admin):
- [ ] Create new user
- [ ] View all users
- [ ] Update user info
- [ ] Cannot delete own account
- [ ] Cannot create duplicate username
- [ ] Reset user password
- [ ] Deactivate user
- [ ] Reactivate user

### Password Management:
- [ ] Change own password (correct old)
- [ ] Change password (wrong old)
- [ ] Weak password rejected
- [ ] Admin reset password

### Permissions:
- [ ] Admin can manage users
- [ ] Doctor cannot manage users
- [ ] User cannot manage users
- [ ] Role hierarchy enforced

### UI:
- [ ] Login screen displays correctly
- [ ] Dashboard loads properly
- [ ] Dark mode works
- [ ] Navigation works
- [ ] Role badge displays
- [ ] Logout confirmation

### Security:
- [ ] Passwords are hashed
- [ ] Sessions are private
- [ ] SQL injection prevented
- [ ] XSS attempts blocked
- [ ] Audit logs created

---

## 🎓 Advanced Testing

### Performance Test
**Console:**
```javascript
// Create 10 users rapidly
for(let i = 1; i <= 10; i++) {
  await window.electronAPI.createUser({
    username: `testuser${i}`,
    password: "test123",
    full_name: `Test User ${i}`,
    role: "User"
  });
}
```

**Expected:**
- All created successfully
- Database handles concurrent operations
- No corruption or locks

### Concurrent Login Test
**Steps:**
1. Login as user1
2. Without logging out, try operations
3. Logout
4. Login as user2

**Expected:**
- Only one session active at a time
- Previous session cleared on new login

---

## 🐛 Bug Reporting

If you find any issues during testing:

1. **Document the issue:**
   - What you did
   - What you expected
   - What actually happened
   - Screenshots if applicable

2. **Check console logs:**
   - Open DevTools (Ctrl+Shift+I)
   - Check Console tab for errors

3. **Check database:**
   - Open clinic.db with SQLite browser
   - Verify data integrity

4. **Note the context:**
   - User role
   - Operating system
   - App version

---

## ✅ Expected Test Results

After completing all tests, you should have:

1. ✅ Working login/logout
2. ✅ Multiple users created
3. ✅ Audit logs populated
4. ✅ Password changes verified
5. ✅ Role-based access confirmed
6. ✅ UI elements functioning
7. ✅ Security measures validated

---

**Testing Phase:** Phase 2 Complete  
**Total Tests:** 28  
**Expected Pass Rate:** 100%  
**Time Required:** 30-45 minutes for full suite
