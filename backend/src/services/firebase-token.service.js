import { createVerify } from "node:crypto";
import { env } from "../config/env.js";

const FIREBASE_CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

let certCache = {
  expiresAt: 0,
  certs: {}
};

function decodeBase64Url(value) {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function parseJwtPart(value) {
  return JSON.parse(decodeBase64Url(value).toString("utf8"));
}

function getMaxAgeSeconds(cacheControl) {
  const match = /max-age=(\d+)/i.exec(cacheControl || "");
  return match ? Number(match[1]) : 3600;
}

async function getFirebaseCerts() {
  if (Date.now() < certCache.expiresAt && Object.keys(certCache.certs).length) {
    return certCache.certs;
  }

  const response = await fetch(FIREBASE_CERTS_URL);
  if (!response.ok) {
    throw new Error(`Could not fetch Firebase public certificates (${response.status})`);
  }

  const maxAgeSeconds = getMaxAgeSeconds(response.headers.get("cache-control"));
  certCache = {
    expiresAt: Date.now() + maxAgeSeconds * 1000,
    certs: await response.json()
  };

  return certCache.certs;
}

function verifySignature(header, signingInput, signature, certs) {
  if (header.alg !== "RS256") {
    throw new Error("Firebase token must use RS256");
  }

  const cert = certs[header.kid];
  if (!cert) {
    throw new Error("Firebase token key is unknown");
  }

  const verifier = createVerify("RSA-SHA256");
  verifier.update(signingInput);
  verifier.end();

  if (!verifier.verify(cert, decodeBase64Url(signature))) {
    throw new Error("Firebase token signature is invalid");
  }
}

function validatePayload(payload) {
  const now = Math.floor(Date.now() / 1000);
  const expectedIssuer = `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`;

  if (payload.aud !== env.FIREBASE_PROJECT_ID) {
    throw new Error("Firebase token audience does not match this project");
  }
  if (payload.iss !== expectedIssuer) {
    throw new Error("Firebase token issuer does not match this project");
  }
  if (!payload.sub || typeof payload.sub !== "string") {
    throw new Error("Firebase token subject is missing");
  }
  if (payload.exp <= now) {
    throw new Error("Firebase token is expired");
  }
  if (payload.iat > now + 300) {
    throw new Error("Firebase token issue time is invalid");
  }

  return {
    ...payload,
    uid: payload.user_id || payload.sub
  };
}

export async function verifyFirebaseIdToken(token) {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Firebase token is malformed");
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const header = parseJwtPart(encodedHeader);
  const payload = parseJwtPart(encodedPayload);
  const certs = await getFirebaseCerts();

  verifySignature(header, `${encodedHeader}.${encodedPayload}`, signature, certs);
  return validatePayload(payload);
}
