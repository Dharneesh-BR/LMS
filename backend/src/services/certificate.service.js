import { randomBytes } from "node:crypto";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import sharp from "sharp";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { ApiError } from "../middleware/error.middleware.js";
import { getCourseBySanityId } from "./course.service.js";
import { getCourseCompletionStatus } from "./assessment.service.js";
import { recordCourseCompletion } from "./course-completion.service.js";

const certificateInclude = {
  course: { select: { sanityId: true, title: true } },
  user: { select: { email: true } }
};
const publicAppUrl =
  env.CERTIFICATE_PUBLIC_URL ||
  env.FRONTEND_URLS.split(",")
    .map((url) => url.trim())
    .find(Boolean) ||
  env.FRONTEND_URL;
const publicApiUrl =
  env.BACKEND_PUBLIC_URL ||
  (process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : `http://localhost:${env.PORT}`);

function cleanName(value) {
  const name = String(value || "").trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 100) {
    throw new ApiError(400, "Certificate name must contain between 2 and 100 characters");
  }
  return name;
}

function publicCertificate(certificate) {
  return {
    certificateNumber: certificate.certificateNumber,
    recipientName: certificate.recipientName,
    courseId: certificate.course.sanityId,
    courseTitle: certificate.course.title,
    completedAt: certificate.completedAt,
    issuedAt: certificate.issuedAt,
    linkedinSharedAt: certificate.linkedinSharedAt,
    verificationUrl: `${publicAppUrl}/certificates/verify/${certificate.certificateNumber}`,
    shareUrl: `${publicApiUrl}/api/certificates/share/${certificate.certificateNumber}`
  };
}

async function completionContext(userId, sanityCourseId) {
  const content = await getCourseBySanityId(sanityCourseId);
  if (!content) throw new ApiError(404, "Course not found");
  const course = await prisma.course.findUnique({ where: { sanityId: sanityCourseId } });
  if (!course) throw new ApiError(404, "Course progress record not found");
  const progress = await prisma.progress.findMany({ where: { userId, courseId: course.id } });
  const finalPassed = content.finalAssessment?._id
    ? Boolean(await prisma.assessmentAttempt.findFirst({
        where: {
          userId,
          courseId: course.id,
          assessmentId: content.finalAssessment._id,
          type: "FINAL",
          passed: true
        }
      }))
    : false;
  const status = getCourseCompletionStatus(content, progress, finalPassed);
  const completion = await recordCourseCompletion({
    userId,
    courseId: course.id,
    courseCompleted: status.courseCompleted
  });
  return { content, course, status, completion };
}

export async function getCourseCertificateEligibility(user, sanityCourseId) {
  const context = await completionContext(user.id, sanityCourseId);
  const certificate = await prisma.certificate.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: context.course.id } },
    include: certificateInclude
  });

  return {
    eligible: context.status.courseCompleted && Boolean(context.content.certificateTemplate),
    courseCompleted: context.status.courseCompleted,
    completedAt: context.completion?.completedAt || null,
    suggestedName: user.name || user.email?.split("@")[0] || "",
    template: context.content.certificateTemplate || null,
    certificate: certificate ? publicCertificate(certificate) : null
  };
}

function certificateSnapshot(template) {
  return {
    heading: template.heading,
    introText: template.introText,
    completionText: template.completionText,
    footerText: template.footerText,
    verificationText: template.verificationText,
    primaryColor: template.primaryColor || "#000047",
    accentColor: template.accentColor || "#12cfe0",
    backgroundImageUrl: template.backgroundImageUrl || null,
    logoUrl: template.logoUrl || null,
    signatories: template.signatories || []
  };
}

async function createCertificateNumber() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const number = `MAG-${new Date().getUTCFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
    const exists = await prisma.certificate.findUnique({ where: { certificateNumber: number } });
    if (!exists) return number;
  }
  throw new ApiError(500, "Unable to allocate a certificate number");
}

export async function issueCertificate(user, sanityCourseId, recipientName) {
  const context = await completionContext(user.id, sanityCourseId);
  if (!context.status.courseCompleted || !context.completion) {
    throw new ApiError(403, "Complete the entire course before generating a certificate");
  }
  const template = context.content.certificateTemplate;
  if (!template?._id) {
    throw new ApiError(409, "A certificate template has not been configured for this course");
  }

  const existing = await prisma.certificate.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: context.course.id } },
    include: certificateInclude
  });
  if (existing) return publicCertificate(existing);

  const certificate = await prisma.certificate.create({
    data: {
      certificateNumber: await createCertificateNumber(),
      userId: user.id,
      courseId: context.course.id,
      completionId: context.completion.id,
      recipientName: cleanName(recipientName),
      completedAt: context.completion.completedAt,
      templateId: template._id,
      templateVersion: template.version || 1,
      contentSnapshot: certificateSnapshot(template)
    },
    include: certificateInclude
  });
  return publicCertificate(certificate);
}

export async function listCertificates(userId) {
  const certificates = await prisma.certificate.findMany({
    where: { userId },
    include: certificateInclude,
    orderBy: { issuedAt: "desc" }
  });
  return certificates.map(publicCertificate);
}

export async function verifyCertificate(certificateNumber) {
  const certificate = await prisma.certificate.findUnique({
    where: { certificateNumber },
    include: certificateInclude
  });
  if (!certificate) throw new ApiError(404, "Certificate not found");
  return publicCertificate(certificate);
}

export async function markCertificateLinkedInShared(certificateNumber, requestingUser) {
  const certificate = await prisma.certificate.findUnique({
    where: { certificateNumber },
    include: certificateInclude
  });
  if (!certificate) throw new ApiError(404, "Certificate not found");
  if (certificate.userId !== requestingUser.id && requestingUser.role !== "ADMIN") {
    throw new ApiError(403, "You do not have access to this certificate");
  }

  const updated = await prisma.certificate.update({
    where: { id: certificate.id },
    data: certificate.linkedinSharedAt ? {} : { linkedinSharedAt: new Date() },
    include: certificateInclude
  });
  return publicCertificate(updated);
}

async function imageBuffer(url) {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}

function replacePlaceholders(text, values) {
  return String(text || "").replace(/\{\{(\w+)\}\}/g, (_match, key) => values[key] ?? "");
}

function escapeMarkup(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function certificateValues(certificate) {
  const completed = new Date(certificate.completedAt);
  return {
    learnerName: certificate.recipientName,
    courseTitle: certificate.course.title,
    completionDate: new Intl.DateTimeFormat("en-IN", {
      dateStyle: "long",
      timeZone: "Asia/Kolkata"
    }).format(completed),
    completionTime: new Intl.DateTimeFormat("en-IN", {
      timeStyle: "short",
      timeZone: "Asia/Kolkata"
    }).format(completed),
    certificateNumber: certificate.certificateNumber,
    verificationUrl: `${publicAppUrl}/certificates/verify/${certificate.certificateNumber}`
  };
}

function wrapText(value, maximumLength = 68) {
  const words = String(value || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maximumLength && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

async function pngDataUri(url) {
  const source = await imageBuffer(url);
  if (!source) return null;
  try {
    const png = await sharp(source).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function createCertificateShareImage(certificateNumber) {
  const certificate = await prisma.certificate.findUnique({
    where: { certificateNumber },
    include: certificateInclude
  });
  if (!certificate) throw new ApiError(404, "Certificate not found");
  return renderCertificateShareImage(certificate);
}

export async function renderCertificateShareImage(certificate) {
  const template = certificate.contentSnapshot;
  const values = certificateValues(certificate);
  const completionLines = wrapText(replacePlaceholders(template.completionText, values));
  const signatory = template.signatories?.[0] || {};
  const [background, logo, signature, qrCode] = await Promise.all([
    pngDataUri(template.backgroundImageUrl),
    pngDataUri(template.logoUrl),
    pngDataUri(signatory.signatureUrl),
    QRCode.toDataURL(values.verificationUrl, {
      width: 150,
      margin: 1,
      color: { dark: template.primaryColor || "#000047" }
    })
  ]);
  const primary = escapeMarkup(template.primaryColor || "#000047");
  const accent = escapeMarkup(template.accentColor || "#12cfe0");
  const completionText = completionLines.map((line, index) => (
    `<tspan x="600" dy="${index === 0 ? 0 : 34}">${escapeMarkup(line)}</tspan>`
  )).join("");

  const svg = `
    <svg width="1200" height="627" viewBox="0 0 1200 627" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="627" fill="#f7f9ff"/>
      ${background ? `<image href="${background}" width="1200" height="627" preserveAspectRatio="xMidYMid slice" opacity="0.2"/>` : ""}
      <rect x="20" y="20" width="1160" height="587" fill="none" stroke="${primary}" stroke-width="12"/>
      <rect x="38" y="38" width="1124" height="551" fill="none" stroke="${accent}" stroke-width="3"/>
      ${logo ? `<image href="${logo}" x="500" y="53" width="200" height="58" preserveAspectRatio="xMidYMid meet"/>` : ""}
      <text x="600" y="${logo ? 155 : 125}" text-anchor="middle" font-family="Arial, sans-serif" font-size="46" font-weight="700" fill="${primary}">${escapeMarkup(replacePlaceholders(template.heading, values))}</text>
      <text x="600" y="${logo ? 205 : 180}" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#4b5563">${escapeMarkup(replacePlaceholders(template.introText, values))}</text>
      <text x="600" y="${logo ? 265 : 245}" text-anchor="middle" font-family="Arial, sans-serif" font-size="50" font-weight="700" fill="${primary}">${escapeMarkup(certificate.recipientName)}</text>
      <line x1="365" y1="${logo ? 286 : 266}" x2="835" y2="${logo ? 286 : 266}" stroke="${accent}" stroke-width="4"/>
      <text x="600" y="${logo ? 335 : 315}" text-anchor="middle" font-family="Arial, sans-serif" font-size="27" fill="#374151">${completionText}</text>
      <text x="600" y="${logo ? 415 : 395}" text-anchor="middle" font-family="Arial, sans-serif" font-size="19" fill="#6b7280">Completed ${escapeMarkup(values.completionDate)} at ${escapeMarkup(values.completionTime)}</text>
      ${signature ? `<image href="${signature}" x="165" y="430" width="160" height="55" preserveAspectRatio="xMidYMid meet"/>` : ""}
      <line x1="125" y1="500" x2="365" y2="500" stroke="#9ca3af" stroke-width="2"/>
      <text x="245" y="525" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="${primary}">${escapeMarkup(signatory.name || "Authorized Signatory")}</text>
      <text x="245" y="548" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#6b7280">${escapeMarkup(signatory.designation || "Magnafic Academy")}</text>
      <image href="${qrCode}" x="1000" y="430" width="120" height="120"/>
      <text x="1060" y="570" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#6b7280">${escapeMarkup(template.verificationText || "Scan to verify")}</text>
      <text x="600" y="574" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" fill="#6b7280">${escapeMarkup(template.footerText || "Issued by Magnafic Academy")} &#8226; ${escapeMarkup(certificate.certificateNumber)}</text>
    </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function getCertificateShareMetadata(certificateNumber) {
  const certificate = await prisma.certificate.findUnique({
    where: { certificateNumber },
    include: certificateInclude
  });
  if (!certificate) throw new ApiError(404, "Certificate not found");
  const verificationUrl = `${publicAppUrl}/certificates/verify/${certificate.certificateNumber}`;
  return {
    title: `${certificate.recipientName} completed ${certificate.course.title}`,
    description: `View and verify this Magnafic Academy course completion certificate.`,
    imageUrl: `${publicApiUrl}/api/certificates/${certificate.certificateNumber}/image.png`,
    shareUrl: `${publicApiUrl}/api/certificates/share/${certificate.certificateNumber}`,
    verificationUrl
  };
}

export async function createCertificatePdf(certificateNumber, requestingUser) {
  const certificate = await prisma.certificate.findUnique({
    where: { certificateNumber },
    include: certificateInclude
  });
  if (!certificate) throw new ApiError(404, "Certificate not found");

  assertCertificateDownloadAllowed(certificate, requestingUser);

  return renderCertificatePdf(certificate);
}

export function assertCertificateDownloadAllowed(certificate, requestingUser) {
  if (certificate.userId !== requestingUser.id && requestingUser.role !== "ADMIN") {
    throw new ApiError(403, "You do not have access to this certificate");
  }
  if (!certificate.linkedinSharedAt) {
    throw new ApiError(403, "Share this certificate on LinkedIn before downloading it");
  }
}

export async function renderCertificatePdf(certificate) {
  const template = certificate.contentSnapshot;
  const values = certificateValues(certificate);
  const verificationUrl = values.verificationUrl;
  const [background, logo, qrCode] = await Promise.all([
    imageBuffer(template.backgroundImageUrl),
    imageBuffer(template.logoUrl),
    QRCode.toBuffer(verificationUrl, { width: 180, margin: 1, color: { dark: template.primaryColor } })
  ]);
  const signatures = await Promise.all(
    (template.signatories || []).map(async (signatory) => ({
      ...signatory,
      image: await imageBuffer(signatory.signatureUrl)
    }))
  );

  const document = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });
  const chunks = [];
  document.on("data", (chunk) => chunks.push(chunk));
  const finished = new Promise((resolve, reject) => {
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);
  });

  const width = document.page.width;
  const height = document.page.height;
  if (background) document.image(background, 0, 0, { width, height });
  else {
    document.rect(0, 0, width, height).fill("#f7f9ff");
    document.lineWidth(8).strokeColor(template.primaryColor).rect(22, 22, width - 44, height - 44).stroke();
    document.lineWidth(2).strokeColor(template.accentColor).rect(34, 34, width - 68, height - 68).stroke();
  }
  if (logo) document.image(logo, width / 2 - 70, 55, { fit: [140, 55], align: "center" });

  document.fillColor(template.primaryColor).font("Helvetica-Bold").fontSize(30)
    .text(replacePlaceholders(template.heading, values), 90, 105, { width: width - 180, align: "center" });
  document.font("Helvetica").fontSize(15).fillColor("#4b5563")
    .text(replacePlaceholders(template.introText, values), 100, 165, { width: width - 200, align: "center" });
  document.font("Helvetica-Bold").fontSize(31).fillColor(template.primaryColor)
    .text(certificate.recipientName, 90, 200, { width: width - 180, align: "center" });
  document.moveTo(width / 2 - 170, 246).lineTo(width / 2 + 170, 246)
    .lineWidth(2).strokeColor(template.accentColor).stroke();
  document.font("Helvetica").fontSize(16).fillColor("#374151")
    .text(replacePlaceholders(template.completionText, values), 110, 267, {
      width: width - 220,
      align: "center",
      lineGap: 5
    });
  document.font("Helvetica").fontSize(12).fillColor("#6b7280")
    .text(`Completed ${values.completionDate} at ${values.completionTime}`, 110, 344, {
      width: width - 220,
      align: "center"
    });

  signatures.slice(0, 2).forEach((signatory, index) => {
    const x = index === 0 ? 120 : width - 310;
    if (signatory.image) document.image(signatory.image, x + 45, 390, { fit: [100, 38], align: "center" });
    document.moveTo(x, 438).lineTo(x + 190, 438).lineWidth(1).strokeColor("#9ca3af").stroke();
    document.font("Helvetica-Bold").fontSize(10).fillColor(template.primaryColor)
      .text(signatory.name || "", x, 445, { width: 190, align: "center" });
    document.font("Helvetica").fontSize(9).fillColor("#6b7280")
      .text(signatory.designation || "", x, 459, { width: 190, align: "center" });
  });

  document.image(qrCode, width - 118, height - 118, { width: 68 });
  document.font("Helvetica").fontSize(7).fillColor("#6b7280")
    .text(template.verificationText || "Scan to verify", width - 155, height - 44, { width: 140, align: "center" });
  document.font("Helvetica").fontSize(9).fillColor("#6b7280")
    .text(`${template.footerText || ""}\n${certificate.certificateNumber}`, 50, height - 58, {
      width: width - 220,
      align: "left"
    });
  document.end();

  return finished;
}
