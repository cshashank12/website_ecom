/* ============================================
   ROYAL ABAYA — Firebase Configuration
   ============================================
   
   HOW TO SET UP:
   1. Go to https://console.firebase.google.com
   2. Click "Add project" → name it (e.g., "royal-abaya")
   3. Disable Google Analytics (optional) → Create Project
   4. Click the web icon (</>) to add a web app
   5. Register app name → copy the config object below
   6. Go to "Realtime Database" in the sidebar → Create Database
   7. Choose a location → Start in TEST MODE → Enable
   8. Replace the placeholder values below with your Firebase config
   
   ============================================ */

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Database reference
const db = firebase.database();
const productsRef = db.ref('products');
