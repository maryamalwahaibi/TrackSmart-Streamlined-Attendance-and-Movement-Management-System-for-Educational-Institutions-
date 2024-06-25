#include <ESP8266WiFi.h>
#include <FirebaseESP8266.h>
#include <NTPClient.h>
#include <WiFiUdp.h>


// Replace these with your Firebase project credentials
#define FIREBASE_HOST "rfid-14ff1-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH "OZw5W9hbrfuA0AwkrtvR2zkXRRJAeBDwJx5czrZC"

// Set up the push button pin
const int buttonPin = D3;

// Create instances for Firebase
FirebaseData firebaseData;
FirebaseConfig config;
FirebaseAuth auth;

// NTP client to get the time
WiFiUDP ntpUDP;
const long utcOffsetInSeconds = 4 * 3600; // Asia/Muscat time offset
NTPClient timeClient(ntpUDP, "pool.ntp.org", utcOffsetInSeconds, 60000);

void setup() {
  Serial.begin(115200);
  pinMode(buttonPin, INPUT_PULLUP); // Initialize the push button pin

  // Connect to Wi-Fi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.println("Connected to WiFi");

  // Configure Firebase
  config.host = FIREBASE_HOST;
  config.signer.tokens.legacy_token = FIREBASE_AUTH;

  // Connect to Firebase
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  Serial.println("Connected to Firebase");

  // Initialize NTP client
  timeClient.begin();
  timeClient.setTimeOffset(utcOffsetInSeconds); // Set the time offset
}

void loop() {
  // Check if the button is pressed
  if (digitalRead(buttonPin) == LOW) {
    Serial.println("Button pressed");

    // Get the current time
    Serial.println("Updating time...");
    timeClient.update();
    String dateTime = timeClient.getFormattedTime();
    Serial.println("Current time: " + dateTime);

    // Save the button press event to Firebase
    saveButtonPressToFirebase(dateTime);
    
    // Debounce the button
    delay(1000);
  }
}

void saveButtonPressToFirebase(String dateTime) {
  String path = "/notifications/" + String(millis());
  FirebaseJson json;
  json.set("message", "Button pressed");
  json.set("datetime", dateTime);
  json.set("studentName", "Nabhan");
  String jsonString;
  json.toString(jsonString, true);
  Serial.println("Saving to Firebase: " + path + " with data: " + jsonString);
  if (Firebase.setJSON(firebaseData, path, json)) {
    Serial.println("Button press saved to Firebase successfully");
  } else {
    Serial.println("Failed to save button press to Firebase");
    Serial.println("REASON: " + firebaseData.errorReason());
  }
}