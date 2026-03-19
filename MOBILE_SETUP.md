# 📱 TailorPro Mobile Setup Guide

## Prerequisites

### 1. Update Node.js (Required)
Your current Node.js v18 shows warnings. Update to Node.js 20 LTS:
- Download from: https://nodejs.org/
- Choose "20.x LTS (Recommended)"
- Install and restart your terminal

Verify:
```bash
node -v
# Should show v20.x.x
```

### 2. Install Android Studio (For Android)
1. Download: https://developer.android.com/studio
2. Install with default options
3. Open Android Studio → SDK Manager
4. Install:
   - Android SDK Platform 34
   - Android SDK Build-Tools
   - Android Emulator
   - Android SDK Platform-Tools

### 3. Install Xcode (For iOS - Mac Only)
1. Download from Mac App Store
2. Open Xcode and accept license
3. Install Command Line Tools:
```bash
xcode-select --install
```

---

## 🚀 Quick Start: Add Mobile Support

### Step 1: Install Capacitor
```bash
cd C:\Users\pc\tailoring-platform-flutter-dashboard

npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
```

### Step 2: Initialize Capacitor
```bash
npx cap init "TailorPro" "com.tailorpro.app" --web-dir dist
```

### Step 3: Build Web App
```bash
npm run build
```

### Step 4: Add Android Platform
```bash
npx cap add android
npx cap sync android
```

### Step 5: Open in Android Studio
```bash
npx cap open android
```

### Step 6: Run on Device/Emulator
In Android Studio:
1. Click green "Run" button (▶)
2. Select your device or emulator
3. Wait for build and install

---

## 📲 Generate APK (Android)

### Debug APK (for testing)
```bash
cd android
./gradlew assembleDebug
```
APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

### Release APK (for Play Store)
```bash
cd android
./gradlew assembleRelease
```

### AAB for Play Store
```bash
cd android
./gradlew bundleRelease
```

---

## 🍎 iOS Build (Mac Only)

### Add iOS Platform
```bash
npx cap add ios
npx cap sync ios
npx cap open ios
```

### In Xcode:
1. Select your development team
2. Choose a real device or simulator
3. Click Run (▶)

---

## 🔄 Development Workflow

### After making code changes:
```bash
npm run build        # Rebuild web app
npx cap sync         # Sync to native projects
npx cap open android # Open Android Studio
# or
npx cap open ios     # Open Xcode
```

### Live Reload (Development)
```bash
npm run dev          # Start dev server
```
Then update `capacitor.config.ts`:
```typescript
server: {
  url: 'http://YOUR_LOCAL_IP:5173',
  cleartext: true
}
```

---

## 📦 App Store Deployment

### Google Play Store
1. Create keystore:
```bash
keytool -genkey -v -keystore tailorpro.keystore -alias tailorpro -keyalg RSA -keysize 2048 -validity 10000
```

2. Configure signing in `android/app/build.gradle`

3. Build release bundle:
```bash
cd android
./gradlew bundleRelease
```

4. Upload to Play Console: https://play.google.com/console

### Apple App Store
1. Configure signing in Xcode
2. Archive: Product → Archive
3. Upload via Xcode Organizer or Transporter

---

## 🛠 Troubleshooting

### "SDK location not found"
Create `android/local.properties`:
```
sdk.dir=C:\\Users\\pc\\AppData\\Local\\Android\\Sdk
```

### Gradle build fails
```bash
cd android
./gradlew clean
./gradlew build
```

### iOS pods error
```bash
cd ios/App
pod install --repo-update
```

---

## 📋 Checklist Before Publishing

- [ ] Update app version in `capacitor.config.ts`
- [ ] Replace placeholder icons in `public/icons/`
- [ ] Test on real devices (Android + iOS)
- [ ] Configure production API endpoints
- [ ] Set up crash reporting (Firebase/Sentry)
- [ ] Privacy policy and terms of service
- [ ] App store screenshots and descriptions
