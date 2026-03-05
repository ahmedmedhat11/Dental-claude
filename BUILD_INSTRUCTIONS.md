# 🚀 BUILD & DEPLOYMENT INSTRUCTIONS

## Complete Guide to Building Windows Executable

---

## 📋 Prerequisites

### Required Software:
1. **Node.js** (v18 or higher)
   - Download from: https://nodejs.org/
   - Verify: `node --version`

2. **npm** (comes with Node.js)
   - Verify: `npm --version`

3. **Git** (optional, for version control)
   - Download from: https://git-scm.com/

---

## 🔧 Initial Setup

### Step 1: Extract/Clone the Project
```bash
cd dental-clinic-system
```

### Step 2: Install Dependencies
```bash
npm install
```

This will install:
- Electron (v28.1.0)
- better-sqlite3 (v9.2.2)
- bcrypt (v5.1.1)
- electron-builder (v24.9.1)
- Other dependencies

**Note:** Installation may take 5-10 minutes depending on internet speed.

### Step 3: Verify Installation
```bash
npm list --depth=0
```

Should show all required packages installed.

---

## 🧪 Testing in Development

### Run Development Mode:
```bash
npm run dev
```

This will:
- Open DevTools automatically
- Use local database in `./database/clinic.db`
- Enable hot reload (restart to see changes)
- Show console logs

### First Run:
1. Application opens with loading screen
2. Database is created automatically
3. Login screen appears
4. Default credentials: admin / admin123

### Verify Functionality:
- [ ] Login screen displays
- [ ] Database file created in `./database/`
- [ ] No console errors
- [ ] Window opens properly

---

## 📦 Building for Production

### Build Installer + Portable Version:
```bash
npm run build
```

### Build Only Portable Version:
```bash
npm run build:portable
```

### Build Process:
1. Compiles source code
2. Bundles dependencies
3. Creates native modules
4. Packages Electron runtime
5. Creates installer (NSIS)
6. Creates portable executable

**Expected Duration:** 5-15 minutes

### Output Location:
```
dist/
├── Dental Clinic Manager-1.0.0-Setup.exe  (~120 MB)
└── Dental Clinic Manager-1.0.0.exe        (~170 MB)
```

---

## 📁 File Structure After Build

```
dental-clinic-system/
├── src/                        # Source code
├── renderer/                   # UI files
├── database/                   # Database files (dev only)
├── node_modules/              # Dependencies
├── dist/                      # BUILD OUTPUT ⭐
│   ├── win-unpacked/          # Unpacked application
│   ├── Dental Clinic Manager-1.0.0-Setup.exe
│   └── Dental Clinic Manager-1.0.0.exe
└── package.json
```

---

## 🎯 Installer vs Portable

### NSIS Installer (Setup.exe):
✅ Proper installation
✅ Start menu shortcut
✅ Desktop shortcut
✅ Uninstaller included
✅ Updates integration
✅ Smaller file size (~120 MB)

**User Path:** `C:\Users\{Username}\AppData\Local\Programs\dental-clinic-management`

### Portable (Executable):
✅ No installation required
✅ Run from USB/external drive
✅ Portable across computers
✅ Database in app directory
✅ Larger file size (~170 MB)

**Recommended:** Use installer for production deployment.

---

## 🔐 Production Data Locations

### After Installation:

**Database:**
```
%APPDATA%\dental-clinic-management\clinic.db
```
Actual path:
```
C:\Users\{Username}\AppData\Roaming\dental-clinic-management\clinic.db
```

**Backups:**
```
%APPDATA%\dental-clinic-management\backups\
```

**Logs:**
```
%APPDATA%\dental-clinic-management\logs\
```

---

## 📝 Customization Before Build

### 1. Update package.json:
```json
{
  "version": "1.0.0",  // Your version
  "author": "Your Clinic Name",
  "description": "Your description"
}
```

### 2. Add Custom Icon:
- Create `assets/icon.ico` (256x256, Windows format)
- Create `assets/icon.png` (512x512, PNG format)
- Icon generators: https://icoconvert.com/

### 3. Update Build Configuration:
Edit `package.json` → `build` section:
```json
{
  "build": {
    "appId": "com.yourclinic.management",
    "productName": "Your Clinic Name",
    ...
  }
}
```

### 4. Configure Settings:
Copy `.env.example` to `.env` and customize.

---

## 🚀 Deployment Steps

### For Single Computer:

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Locate installer:**
   ```
   dist/Dental Clinic Manager-1.0.0-Setup.exe
   ```

3. **Copy to target computer**

4. **Run installer** (requires admin rights)

5. **First launch:**
   - Login with: admin / admin123
   - Change password immediately
   - Configure clinic settings

### For Multiple Computers:

1. Build once on development machine
2. Copy installer to network share or USB
3. Install on each computer
4. Each installation has its own database

**Note:** This is designed for single-clinic, single-database use.

---

## 🔄 Updates & Versioning

### To Release an Update:

1. **Update version** in `package.json`:
   ```json
   "version": "1.1.0"
   ```

2. **Make your changes**

3. **Test in development:**
   ```bash
   npm run dev
   ```

4. **Build new version:**
   ```bash
   npm run build
   ```

5. **Distribute new installer**

### Database Migration:
- Backup existing database before update
- Test migration in development
- Document schema changes

---

## ⚠️ Common Build Issues

### Issue 1: "Cannot find module 'better-sqlite3'"
**Solution:**
```bash
npm rebuild better-sqlite3 --update-binary
npm run postinstall
```

### Issue 2: "ENOENT: no such file or directory"
**Solution:**
```bash
# Check paths in package.json
# Ensure all files exist in correct locations
```

### Issue 3: "electron-builder not found"
**Solution:**
```bash
npm install --save-dev electron-builder
```

### Issue 4: Build hangs at "packaging"
**Solution:**
- Disable antivirus temporarily
- Run as administrator
- Clear dist folder: `rm -rf dist`

### Issue 5: "bcrypt" native module error
**Solution:**
```bash
npm rebuild bcrypt --update-binary
```

---

## 🧹 Clean Build

If encountering persistent issues:

```bash
# Remove all generated files
rm -rf node_modules
rm -rf dist
rm package-lock.json

# Reinstall
npm install

# Rebuild native modules
npm run postinstall

# Build
npm run build
```

---

## 📊 Build Size Optimization

Current sizes are normal for Electron apps. To reduce:

1. **Use asar packaging** (already enabled)
2. **Exclude dev dependencies** (already configured)
3. **Compress with NSIS** (already enabled)

Do NOT use external tools to compress the installer - may break the app.

---

## 🔍 Testing the Built Application

### Before Distribution:

1. **Install on clean Windows machine**
2. **Verify all features:**
   - [ ] Login works
   - [ ] Database creates properly
   - [ ] All CRUD operations work
   - [ ] Printing works (if Phase 5 complete)
   - [ ] Backup creates on exit
   - [ ] Settings save correctly

3. **Test edge cases:**
   - [ ] Invalid inputs
   - [ ] Database locks
   - [ ] Network disconnection
   - [ ] Permission issues

4. **Check data locations:**
   - [ ] Database in correct AppData folder
   - [ ] Backups creating properly
   - [ ] No leftover temp files

---

## 📋 Pre-Deployment Checklist

- [ ] Updated version number
- [ ] Tested in development
- [ ] All features working
- [ ] Custom icon added
- [ ] Settings configured
- [ ] Default passwords changed in docs
- [ ] README updated
- [ ] Database backup tested
- [ ] Built and tested installer
- [ ] Tested on clean Windows machine
- [ ] User documentation ready

---

## 🆘 Support After Deployment

### User Issues:

1. **Database Corruption:**
   - Restore from backup folder
   - Check disk space
   - Run database integrity check

2. **Cannot Login:**
   - Reset password via database tool
   - Check user account status
   - Verify database permissions

3. **Slow Performance:**
   - Check database size
   - Optimize with VACUUM
   - Clear old audit logs

4. **Backup Failures:**
   - Check disk space
   - Verify folder permissions
   - Check antivirus settings

---

## 📞 Developer Contact

For technical support during deployment:
- Check logs in AppData folder
- Export database for inspection
- Screenshot error messages
- Note exact steps to reproduce

---

## 🎓 Advanced: Code Signing (Optional)

For professional deployment:

1. **Obtain code signing certificate**
2. **Configure in package.json:**
   ```json
   {
     "build": {
       "win": {
         "certificateFile": "path/to/cert.pfx",
         "certificatePassword": "password"
       }
     }
   }
   ```
3. **Build signed installer**

Benefits:
- No Windows SmartScreen warning
- Verified publisher name
- Increased user trust

---

## ✅ Final Notes

- **Always test on target OS** before mass deployment
- **Keep source code** for future updates
- **Document customizations** made to the base system
- **Backup development database** before major changes
- **Version control recommended** (Git)

---

**Last Updated:** Phase 1 Complete  
**Build System:** Electron Builder 24.9.1  
**Target Platform:** Windows 10/11 (x64)
