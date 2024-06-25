#include <ESP8266WiFi.h>
#include <FirebaseESP8266.h>
#include <SPI.h>
#include <MFRC522.h>
#include <NTPClient.h>
#include <WiFiUdp.h>

// Replace these with your network credentials
const char* ssid = "Maryam";
const char* password = "12345678";

// Replace these with your Firebase project credentials
#define FIREBASE_HOST "rfid-14ff1-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH "OZw5W9hbrfuA0AwkrtvR2zkXRRJAeBDwJx5czrZC"

// Create instances for RFID and Firebase
MFRC522 mfrc522(D2, D1); // Create MFRC522 instance
FirebaseData firebaseData;
FirebaseConfig config;
FirebaseAuth auth;

// NTP client to get the time
WiFiUDP ntpUDP;
const long utcOffsetInSeconds = 4 * 3600; // Asia/Muscat time offset
NTPClient timeClient(ntpUDP, "pool.ntp.org", utcOffsetInSeconds, 60000);

// LED pins
const int greenLedPin = D0;
const int redLedPin = D8;

void setup() {
  Serial.begin(115200);
  SPI.begin(); // Init SPI bus
  mfrc522.PCD_Init(); // Init MFRC522
  Serial.println("RFID Reader initialized.");

  // Set up LED pins
  pinMode(greenLedPin, OUTPUT);
  pinMode(redLedPin, OUTPUT);

  // Turn off both LEDs initially
  digitalWrite(greenLedPin, LOW);
  digitalWrite(redLedPin, LOW);

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

// Function to read and register new RFID cards
void registerCard() {
  Serial.println("Scan a new card to register it:");

  // Wait until a new card is present
  if (!mfrc522.PICC_IsNewCardPresent()) {
  }

  // Read the card serial number
  if (mfrc522.PICC_ReadCardSerial()) {
    Serial.print("UID tag: ");
    String uid = "";
    for (byte i = 0; i < mfrc522.uid.size; i++) {
      Serial.print(mfrc522.uid.uidByte[i] < 0x10 ? " 0" : " ");
      Serial.print(mfrc522.uid.uidByte[i], HEX);
      uid.concat(String(mfrc522.uid.uidByte[i], HEX));
    }
    Serial.println();

    // Print the UID for debugging
    Serial.print("Card UID: ");
    Serial.println(uid);

    // Get the current time
    Serial.println("Updating time...");
    timeClient.update();
    String dateTime = timeClient.getFormattedTime();
    Serial.println("Current time: " + dateTime);

    // Retrieve the card data from Firebase
    String path = "/cards/" + uid;
    if (Firebase.getJSON(firebaseData, path)) {
      FirebaseJson &json = firebaseData.jsonObject();
      FirebaseJsonData jsonData;
      String name, position, email, classNumber, classCode;
      json.get(jsonData, "name");
      name = jsonData.stringValue;
      json.get(jsonData, "position");
      position = jsonData.stringValue;
      json.get(jsonData, "email");
      email = jsonData.stringValue;
      json.get(jsonData, "classNumber");
      classNumber = jsonData.stringValue;
      json.get(jsonData, "classCode");
      classCode = jsonData.stringValue;
      saveUIDtoFirebase(uid, name, position, email, classNumber, classCode, dateTime);
      digitalWrite(greenLedPin, HIGH);
      digitalWrite(redLedPin, LOW);
    } else {
      Serial.println("Unknown card type");
      digitalWrite(greenLedPin, LOW);
      digitalWrite(redLedPin, HIGH);
    }

    // Turn off LEDs after a short delay
    delay(1000);
    digitalWrite(greenLedPin, LOW);
    digitalWrite(redLedPin, LOW);
  }
}

// Function to save UID and time to Firebase
void saveUIDtoFirebase(String uid, String name, String position, String email, String classNumber, String classCode, String dateTime) {
  String path = "/logs/" + uid + "/" + dateTime;
  FirebaseJson json;
  json.set("uid", uid);
  json.set("name", name);
  json.set("position", position);
  json.set("email", email);
  json.set("classNumber", classNumber);
  json.set("classCode", classCode);
  json.set("datetime", dateTime);
  json.set("deviceID", "YOUR_DEVICE_ID"); // Replace with your actual device ID
  String jsonString;
  json.toString(jsonString, true);
  Serial.println("Saving to Firebase: " + path + " with data: " + jsonString);
  if (Firebase.setJSON(firebaseData, path, json)) {
    Serial.println("UID and time saved to Firebase successfully");
  } else {
    Serial.println("Failed to save UID to Firebase");
    Serial.println("REASON: " + firebaseData.errorReason());
  }
}

// Main loop to check for new cards and register them
void loop() {
  registerCard();
}