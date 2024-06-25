import { auth, database } from './firebase-config.js';
import { onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";
import { ref, set, get, child, onValue, update, remove } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-database.js";

let currentEditUID = null;

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'index.html';
    } else {
        loadAllCards();
        setupRealTimeLogListener();
        generateChart();
        setupRealTimeNotificationListener();
        loadCheckInTime();
    }
});

// Function to add a new card
document.getElementById('addCardForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const uid = document.getElementById('uid').value;
    const name = document.getElementById('name').value;
    const position = document.getElementById('position').value;
    const email = document.getElementById('email').value;
    const classNumber = document.getElementById('classNumber').value;
    const classCode = document.getElementById('classCode').value;

    // Validate fields based on position
    if (position === 'student') {
        if (!classNumber || !classCode) {
            alert('Class Number and Class Code are required for students.');
            return;
        }
    } else if (position === 'staff') {
        if (!email) {
            alert('Email is required for staff.');
            return;
        }
    } else if (position === 'visitor') {
        if (!name) {
            alert('Name is required for visitors.');
            return;
        }
    }

    set(ref(database, 'cards/' + uid), {
        name: name,
        position: position,
        email: email,
        classNumber: classNumber,
        classCode: classCode,
        lastScan: ''
    }).then(() => {
        document.getElementById('addCardForm').reset();
        loadAllCards();
    }).catch((error) => {
        console.error("Error adding card: ", error);
    });
});

document.getElementById('position').addEventListener('change', function () {
    const position = this.value;
    const classNumberField = document.getElementById('classNumber');
    const classCodeField = document.getElementById('classCode');
    const emailField = document.getElementById('email');

    if (position === 'student') {
        classNumberField.required = true;
        classCodeField.required = true;
        emailField.required = true;
    } else if (position === 'staff') {
        classNumberField.required = false;
        classCodeField.required = false;
        emailField.required = true;
    } else if (position === 'visitor') {
        classNumberField.required = false;
        classCodeField.required = false;
        emailField.required = false;
    }
});

// Function to search for cards
document.getElementById('searchForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const query = document.getElementById('searchQuery').value.toLowerCase();
    const searchResult = document.getElementById('searchResult');
    searchResult.innerHTML = '';

    get(child(ref(database), 'cards')).then((snapshot) => {
        if (snapshot.exists()) {
            const cards = snapshot.val();
            for (const uid in cards) {
                if (cards.hasOwnProperty(uid)) {
                    const card = cards[uid];
                    if (uid.toLowerCase().includes(query) ||
                        card.name.toLowerCase().includes(query) ||
                        card.email.toLowerCase().includes(query)) {
                        const result = document.createElement('div');
                        result.classList.add('log-card');
                        result.innerHTML = `
                            <p><strong>Name:</strong> ${card.name}</p>
                            <p><strong>ID:</strong> ${uid}</p>
                            <p><strong>Email:</strong> ${card.email}</p>
                            <p><strong>Position:</strong> ${card.position}</p>
                            <p><strong>Class Number:</strong> ${card.classNumber}</p>
                            <p><strong>Class Code:</strong> ${card.classCode}</p>
                        `;
                        searchResult.appendChild(result);
                    }
                }
            }
        } else {
            searchResult.innerHTML = 'No data found';
        }
    }).catch((error) => {
        searchResult.innerHTML = 'Error: ' + error.message;
    });
});

// Function to load all cards and display in the table
function loadAllCards() {
    const cardsTableBody = document.getElementById('cardsTable').getElementsByTagName('tbody')[0];
    cardsTableBody.innerHTML = '';

    get(child(ref(database), 'cards')).then((snapshot) => {
        if (snapshot.exists()) {
            const cards = snapshot.val();
            document.getElementById('totalCards').innerText = Object.keys(cards).length; // Total number of cards
            for (const uid in cards) {
                if (cards.hasOwnProperty(uid)) {
                    const card = cards[uid];
                    const row = cardsTableBody.insertRow();
                    row.insertCell(0).innerText = card.name;
                    row.insertCell(1).innerText = uid;
                    row.insertCell(2).innerText = card.email;
                    row.insertCell(3).innerText = card.position;
                    row.insertCell(4).innerText = card.classNumber;
                    row.insertCell(5).innerText = card.classCode;
                    const actionsCell = row.insertCell(6);
                    actionsCell.innerHTML = `
                        <button class="edit-button" data-uid="${uid}">Edit</button>
                        <button class="delete-button" data-uid="${uid}">Delete</button>
                    `;
                }
            }
            setupEditDeleteListeners();
        }
    }).catch((error) => {
        console.error("Error loading cards: ", error);
    });
}

// Function to set up real-time listener for logs
function setupRealTimeLogListener() {
    const logsTableBody = document.getElementById('logsTable').getElementsByTagName('tbody')[0];
    const logsRef = ref(database, 'logs');

    onValue(logsRef, (snapshot) => {
        logsTableBody.innerHTML = ''; // Clear existing logs
        if (snapshot.exists()) {
            const logs = snapshot.val();
            let scanCounts = 0;
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            for (const uid in logs) {
                if (logs.hasOwnProperty(uid)) {
                    const logEntries = logs[uid];
                    let scannedThisWeek = false;
                    for (const timestamp in logEntries) {
                        if (logEntries.hasOwnProperty(timestamp)) {
                            const log = logEntries[timestamp];
                            const logDate = new Date(log.datetime);
                            if (logDate >= sevenDaysAgo) {
                                scanCounts++;
                                scannedThisWeek = true;
                            }
                            const row = logsTableBody.insertRow();
                            row.insertCell(0).innerText = log.name;
                            row.insertCell(1).innerText = uid;
                            row.insertCell(2).innerText = log.email;
                            row.insertCell(3).innerText = log.position;
                            row.insertCell(4).innerText = log.classNumber;
                            row.insertCell(5).innerText = log.classCode;
                            row.insertCell(6).innerText = log.datetime;
                        }
                    }
                }
            }
            document.getElementById('scansLast7Days').innerText = scanCounts; // Number of scans in the last 7 days
            generateChart();
        }
    }, (error) => {
        console.error("Error setting up real-time listener: ", error);
    });
}

// Function to generate chart for logs
function generateChart() {
    const logsRef = ref(database, 'logs');
    get(logsRef).then((snapshot) => {
        if (snapshot.exists()) {
            const logs = snapshot.val();
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const labels = [];
            const data = [];
            let dateCursor = new Date();
            for (let i = 6; i >= 0; i--) {
                dateCursor.setDate(sevenDaysAgo.getDate() + i);
                labels.push(days[dateCursor.getDay()]);
                data.push(0);
            }

            const counts = {};
            for (const uid in logs) {
                if (logs.hasOwnProperty(uid)) {
                    const logEntries = logs[uid];
                    for (const timestamp in logEntries) {
                        if (logEntries.hasOwnProperty(timestamp)) {
                            const log = logEntries[timestamp];
                            const logDate = new Date(log.datetime);
                            if (logDate >= sevenDaysAgo) {
                                const day = days[logDate.getDay()];
                                if (!counts[day]) {
                                    counts[day] = 0;
                                }
                                counts[day]++;
                            }
                        }
                    }
                }
            }

            labels.forEach((label, index) => {
                if (counts[label]) {
                    data[index] = counts[label];
                }
            });

            const ctx = document.getElementById('logsChart').getContext('2d');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Scans in the Last 7 Days',
                        data: data,
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
            console.log('Chart generated successfully'); // Debugging log

            // Update statistics
            const totalCards = document.getElementById('totalCards').innerText;
            const cardsNotScannedCount = totalCards - Object.keys(counts).length;
            document.getElementById('cardsNotScanned').innerText = cardsNotScannedCount; // Number of cards not scanned in the last 7 days
        } else {
            console.log('No logs data found'); // Debugging log
        }
    }).catch((error) => {
        console.error("Error generating chart: ", error);
    });
}

// Function to export logs as CSV
document.getElementById('exportLogsButton').addEventListener('click', function () {
    const logsRef = ref(database, 'logs');
    get(logsRef).then((snapshot) => {
        if (snapshot.exists()) {
            const logs = snapshot.val();
            let csvContent = "data:text/csv;charset=utf-8,";
            csvContent += "Name,ID,Email,Position,Class Number,Class Code,Timestamp\n"; // Header

            for (const uid in logs) {
                if (logs.hasOwnProperty(uid)) {
                    const logEntries = logs[uid];
                    for (const timestamp in logEntries) {
                        if (logEntries.hasOwnProperty(timestamp)) {
                            const log = logEntries[timestamp];
                            csvContent += `${log.name},${uid},${log.email},${log.position},${log.classNumber},${log.classCode},${log.datetime}\n`;
                        }
                    }
                }
            }

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "scan_logs.csv");
            document.body.appendChild(link); // Required for FF

            link.click();
            console.log('Logs exported successfully'); // Debugging log
        } else {
            console.log('No logs data found'); // Debugging log
        }
    }).catch((error) => {
        console.error("Error exporting logs: ", error);
    });
});

// Logout function
document.getElementById('logoutButton').addEventListener('click', function () {
    signOut(auth).then(() => {
        window.location.href = 'index.html';
    }).catch((error) => {
        console.error("Error signing out: ", error);
    });
});

// Edit and Delete button event listeners
function setupEditDeleteListeners() {
    document.querySelectorAll('.edit-button').forEach(button => {
        button.addEventListener('click', function () {
            const uid = this.getAttribute('data-uid');
            editCard(uid);
        });
    });

    document.querySelectorAll('.delete-button').forEach(button => {
        button.addEventListener('click', function () {
            const uid = this.getAttribute('data-uid');
            deleteCard(uid);
        });
    });
}

// Function to edit a card
function editCard(uid) {
    currentEditUID = uid;
    get(child(ref(database), `cards/${uid}`)).then((snapshot) => {
        if (snapshot.exists()) {
            const card = snapshot.val();
            document.getElementById('editName').value = card.name;
            document.getElementById('editEmail').value = card.email;
            document.getElementById('editCardModal').style.display = 'block';
        } else {
            alert('Card not found');
        }
    }).catch((error) => {
        console.error("Error fetching card: ", error);
    });
}

document.getElementById('editCardForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const name = document.getElementById('editName').value;
    const email = document.getElementById('editEmail').value;

    update(ref(database, 'cards/' + currentEditUID), {
        name: name,
        email: email
    }).then(() => {
        document.getElementById('editCardModal').style.display = 'none';
        loadAllCards();
    }).catch((error) => {
        console.error("Error updating card: ", error);
    });
});

// Function to delete a card
function deleteCard(uid) {
    if (confirm('Are you sure you want to delete this card?')) {
        set(ref(database, 'cards/' + uid), null).then(() => {
            loadAllCards();
        }).catch((error) => {
            console.error("Error deleting card: ", error);
        });
    }
}

// Close modal functionality
document.querySelector('.close').addEventListener('click', function () {
    document.getElementById('editCardModal').style.display = 'none';
});

// Function to set up real-time listener for push button notifications
function setupRealTimeNotificationListener() {
    const notificationsTableBody = document.getElementById('notificationsTable').getElementsByTagName('tbody')[0];
    const notificationsRef = ref(database, 'notifications');

    onValue(notificationsRef, (snapshot) => {
        notificationsTableBody.innerHTML = ''; // Clear existing notifications
        if (snapshot.exists()) {
            const notifications = snapshot.val();
            for (const timestamp in notifications) {
                if (notifications.hasOwnProperty(timestamp)) {
                    const notification = notifications[timestamp];
                    const muscatTime = new Date(notification.epochTime * 1000).toLocaleString('en-US', { timeZone: 'Asia/Muscat' });
                    const row = notificationsTableBody.insertRow();
                    row.insertCell(0).innerText = muscatTime;
                    row.insertCell(1).innerText = `${notification.studentName} pressed the button`;

                    showNotification(notification.message, muscatTime);
                }
            }
        } else {
            console.log('No notifications found'); // Debugging log
        }
    }, (error) => {
        console.error("Error setting up real-time listener: ", error);
    });
}

// Function to show notification in modal
function showNotification(message, timestamp) {
    const notificationModal = document.getElementById('notificationModal');
    document.getElementById('notificationMessage').innerHTML = `${message} <br><a href="https://maps.app.goo.gl/RRVT3pNYNoH9hGTSA">Location Link</a>`;
    notificationModal.style.display = 'block';

    // Close the modal after a few seconds
    setTimeout(() => {
        notificationModal.style.display = 'none';
    }, 5000);
}

// Close notification modal when clicking on the close button
document.querySelector('#notificationModal .close').addEventListener('click', function () {
    document.getElementById('notificationModal').style.display = 'none';
});

// Function to clear scan logs
document.getElementById('clearLogsButton').addEventListener('click', function () {
    if (confirm('Are you sure you want to clear all scan logs?')) {
        set(ref(database, 'logs'), null).then(() => {
            alert('Scan logs cleared successfully.');
            loadAllCards(); // Reload cards to update the view
        }).catch((error) => {
            console.error("Error clearing scan logs: ", error);
        });
    }
});

// Function to clear notification logs
document.getElementById('clearNotificationsButton').addEventListener('click', function () {
    if (confirm('Are you sure you want to clear all notification logs?')) {
        set(ref(database, 'notifications'), null).then(() => {
            alert('Notification logs cleared successfully.');
            setupRealTimeNotificationListener(); // Reload notifications to update the view
        }).catch((error) => {
            console.error("Error clearing notification logs: ", error);
        });
    }
});

// Function to set the check-in time
document.getElementById('checkInTimeForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const checkInTime = document.getElementById('checkInTime').value;
    set(ref(database, 'settings/checkInTime'), {
        time: checkInTime
    }).then(() => {
        alert('Check-in time set successfully.');
        loadCheckInTime();
    }).catch((error) => {
        console.error("Error setting check-in time: ", error);
    });
});

// Function to load the check-in time
function loadCheckInTime() {
    get(child(ref(database), 'settings/checkInTime')).then((snapshot) => {
        if (snapshot.exists()) {
            const checkInTime = snapshot.val().time;
            document.getElementById('currentCheckInTime').innerText = checkInTime;
        } else {
            document.getElementById('currentCheckInTime').innerText = 'Not set';
        }
    }).catch((error) => {
        console.error("Error loading check-in time: ", error);
    });
}
