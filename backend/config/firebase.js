const admin = require("firebase-admin");

// Parse the JSON stored in the environment variable
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });

  console.log("Firebase initialized successfully!");
}

const db = admin.firestore();

module.exports = { admin, db };
