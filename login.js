import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";

// Login function
document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            console.log('Login successful');
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        })
        .catch((error) => {
            console.error('Login failed:', error);
            alert('Login failed: ' + error.message);
        });
});

// Forgot Password function
document.getElementById('forgotPasswordForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const email = document.getElementById('resetEmail').value;

    sendPasswordResetEmail(auth, email)
        .then(() => {
            console.log('Password reset email sent');
            alert('Password reset email sent.');
        })
        .catch((error) => {
            console.error('Error sending password reset email:', error);
            alert('Error sending password reset email: ' + error.message);
        });
});
