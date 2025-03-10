# To Do List
Developed by: Ing. Javier Toussent Fis  
Email: javiertoussentfis@gmail.com

## Current location Features
- Current location: It's mandatory to allow location permission

## Installation Instructions

### Prerequisites
- Node.js (v20.18.2 or newer)
- npm (v10.8.2 or newer)
- Expo CLI

### Installation Steps

1. Clone the repository
```bash
git clone [https://github.com/JavierTF/mylocation-app]
cd mylocation-app
```

2. Install dependencies
```bash
npm install
```

3. Start the Expo development server
```bash
npx expo start --clear
```

4. Run on a device or emulator
   - Scan the QR code with the Expo Go app on your mobile device
   - Press 'a' to run on an Android emulator
   - Press 'i' to run on an iOS simulator

### Building the APK

To create a standalone APK for Android:

1. Configure app.json for your project details

2. Build the APK
```bash
expo build:android -t apk
```

3. Follow the Expo build instructions to download your APK

## Development Notes
This app was built with Expo, a framework for React Native applications that allows for easy development and deployment across platforms.