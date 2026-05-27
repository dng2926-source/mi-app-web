const admin = require("firebase-admin");
const path = require("path");

let initialized = false;

const initFirebaseAdmin = () => {
  if (initialized) return;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  try {
    if (serviceAccountJson) {
      console.log("📌 Initializing Firebase Admin with FIREBASE_SERVICE_ACCOUNT");
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("✅ Firebase Admin initialized successfully with service account");
    } else if (serviceAccountPath) {
      console.log("📌 Initializing Firebase Admin with service account path");
      const serviceAccount = require(path.resolve(serviceAccountPath));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("✅ Firebase Admin initialized successfully with service account path");
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log("📌 Initializing Firebase Admin with GOOGLE_APPLICATION_CREDENTIALS");
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      console.log("✅ Firebase Admin initialized successfully");
    } else {
      throw new Error(
        "Firebase admin credentials are missing. Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH or GOOGLE_APPLICATION_CREDENTIALS.",
      );
    }
    initialized = true;
  } catch (error) {
    console.error("❌ Error initializing Firebase Admin:", error.message);
    throw error;
  }
};

const verifyIdToken = async (idToken) => {
  try {
    if (!idToken) {
      throw new Error("No ID token provided");
    }
    
    console.log("🔐 Verifying Firebase ID token...");
    initFirebaseAdmin();
    
    const decoded = await admin.auth().verifyIdToken(idToken);
    console.log("✅ Token verified successfully. UID:", decoded.uid);
    return decoded;
  } catch (error) {
    console.error("❌ Firebase token verification failed:");
    console.error("   Error code:", error.code);
    console.error("   Error message:", error.message);
    console.error("   Full error:", error);
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
