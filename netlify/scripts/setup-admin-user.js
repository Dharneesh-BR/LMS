import { db } from "../src/config/database.js";
import { getFirebaseAuth, hasUsableFirebaseServiceAccount } from "../src/config/firebase.js";

const adminEmail = (process.env.ADMIN_EMAIL || "admin@magnafic.com").trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD;
const adminName = process.env.ADMIN_NAME || "Admin";
const adminDepartment = process.env.ADMIN_DEPARTMENT || "Admin";
const adminDesignation = process.env.ADMIN_DESIGNATION || "Admin";

if (!adminPassword) {
  console.error("ADMIN_PASSWORD is required.");
  process.exit(1);
}

if (!hasUsableFirebaseServiceAccount()) {
  console.error("A valid Firebase service account is required. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.");
  process.exit(1);
}

async function upsertFirebaseUser() {
  const firebaseAuth = getFirebaseAuth();

  try {
    const existingUser = await firebaseAuth.getUserByEmail(adminEmail);
    return firebaseAuth.updateUser(existingUser.uid, {
      displayName: adminName,
      password: adminPassword,
      emailVerified: true,
      disabled: false
    });
  } catch (error) {
    if (error?.code !== "auth/user-not-found") {
      throw error;
    }

    return firebaseAuth.createUser({
      email: adminEmail,
      password: adminPassword,
      displayName: adminName,
      emailVerified: true,
      disabled: false
    });
  }
}

async function main() {
  const firebaseUser = await upsertFirebaseUser();

  const user = await db.user.upsert({
    where: { firebaseUid: firebaseUser.uid },
    update: {
      firebaseUid: firebaseUser.uid,
      name: adminName,
      role: "ADMIN"
    },
    create: {
      firebaseUid: firebaseUser.uid,
      email: adminEmail,
      name: adminName,
      department: adminDepartment,
      designation: adminDesignation,
      role: "ADMIN"
    }
  });

  console.log(`Admin user ready: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
