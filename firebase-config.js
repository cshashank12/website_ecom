/* ============================================
   ROYAL ABAYA — Firebase Configuration
   ============================================ */

const firebaseConfig = {
    apiKey: "AIzaSyD_b5PGrwDSjW3zzHQeWaMFkfbbUQZF5Sw",
    authDomain: "royala-ab698.firebaseapp.com",
    databaseURL: "https://royala-ab698-default-rtdb.firebaseio.com",
    projectId: "royala-ab698",
    storageBucket: "royala-ab698.firebasestorage.app",
    messagingSenderId: "768967129798",
    appId: "1:768967129798:web:f97231f400779aec79b5c7"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Database reference
const db = firebase.database();
const productsRef = db.ref('products');
