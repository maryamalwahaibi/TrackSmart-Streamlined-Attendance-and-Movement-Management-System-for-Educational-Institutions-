// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBQlH6YS_lHUYtUH5RUow2SQgIspmxerVs",
  authDomain: "rfid-14ff1.firebaseapp.com",
  databaseURL: "https://rfid-14ff1-default-rtdb.firebaseio.com",
  projectId: "rfid-14ff1",
  storageBucket: "rfid-14ff1.appspot.com",
  messagingSenderId: "275198247742",
  appId: "1:275198247742:web:cde0f75586fffb8f91226f",
  measurementId: "G-KC48VY6TJK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

export { auth, database };
