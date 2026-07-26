import { asyncHandler } from "../middleware/error.middleware.js";
import {
  createCertificateShareImage,
  createCertificatePdf,
  getCertificateShareMetadata,
  getCourseCertificateEligibility,
  issueCertificate,
  listCertificates,
  markCertificateLinkedInShared,
  verifyCertificate
} from "../services/certificate.service.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export const getEligibility = asyncHandler(async (req, res) => {
  const eligibility = await getCourseCertificateEligibility(req.auth.user, req.params.courseId);
  res.json(eligibility);
});

export const createCertificate = asyncHandler(async (req, res) => {
  const certificate = await issueCertificate(
    req.auth.user,
    req.params.courseId,
    req.body.recipientName
  );
  res.status(201).json({ certificate });
});

export const getMyCertificates = asyncHandler(async (req, res) => {
  const certificates = await listCertificates(req.auth.user.id);
  res.json({ certificates });
});

export const getVerification = asyncHandler(async (req, res) => {
  const certificate = await verifyCertificate(req.params.certificateNumber);
  res.json({ valid: true, certificate });
});

export const getShareImage = asyncHandler(async (req, res) => {
  const image = await createCertificateShareImage(req.params.certificateNumber);
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Content-Length", image.length);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.send(image);
});

export const getSharePage = asyncHandler(async (req, res) => {
  const metadata = await getCertificateShareMetadata(req.params.certificateNumber);
  const title = escapeHtml(metadata.title);
  const description = escapeHtml(metadata.description);
  const imageUrl = escapeHtml(metadata.imageUrl);
  const shareUrl = escapeHtml(metadata.shareUrl);
  const verificationUrl = escapeHtml(metadata.verificationUrl);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${shareUrl}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:secure_url" content="${imageUrl}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="627">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${imageUrl}">
  <link rel="canonical" href="${shareUrl}">
  <style>
    body{margin:0;background:#f7f9ff;color:#000047;font-family:Arial,sans-serif}
    main{max-width:1000px;margin:0 auto;padding:48px 20px;text-align:center}
    img{display:block;width:100%;height:auto;border:1px solid #dbe3ff}
    a{display:inline-block;margin-top:24px;padding:14px 22px;border-radius:8px;background:#000047;color:white;font-weight:700;text-decoration:none}
  </style>
</head>
<body>
  <main>
    <h1>${title}</h1>
    <p>${description}</p>
    <img src="${imageUrl}" width="1200" height="627" alt="${title}">
    <a href="${verificationUrl}">Verify this certificate</a>
  </main>
</body>
</html>`);
});

export const recordLinkedInShare = asyncHandler(async (req, res) => {
  const certificate = await markCertificateLinkedInShared(
    req.params.certificateNumber,
    req.auth.user
  );
  res.json({ certificate });
});

export const downloadCertificate = asyncHandler(async (req, res) => {
  const pdf = await createCertificatePdf(req.params.certificateNumber, req.auth.user);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${req.params.certificateNumber}.pdf"`
  );
  res.setHeader("Content-Length", pdf.length);
  res.send(pdf);
});
