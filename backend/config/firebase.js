const admin = require("firebase-admin");
const path = require("path");

// TODO
const serviceAccount = require(path.join(__dirname, "../firebase/serviceAccountKey.json"));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://youtube-scraper-450106-default-rtdb.firebaseio.com",
  });

  console.log("Firebase initialized successfully!");
}

const db = admin.firestore();

module.exports = { admin, db };
