const admin = require("firebase-admin");
const path = require("path");

let initialized = false;

const initFirebaseAdmin = () => {
  if (initialized) return;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else if (serviceAccountPath) {
    const serviceAccount = require(path.resolve(serviceAccountPath));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } else {
    throw new Error(
      "Firebase admin credentials are missing. Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH or GOOGLE_APPLICATION_CREDENTIALS.",
    );
  }

  initialized = true;
};

const verifyIdToken = async (idToken) => {
  try {
    initFirebaseAdmin();
    return await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    console.error("Firebase verifyIdToken error:", error.message, error.code);
    throw error;
  }
};

const revokeRefreshTokens = async (firebaseUid) => {
  initFirebaseAdmin();
  await admin.auth().revokeRefreshTokens(firebaseUid);
};

module.exports = {
  verifyIdToken,
  revokeRefreshTokens,
};
