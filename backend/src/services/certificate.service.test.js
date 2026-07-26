import test from "node:test";
import assert from "node:assert/strict";
import {
  assertCertificateDownloadAllowed,
  renderCertificatePdf,
  renderCertificateShareImage
} from "./certificate.service.js";

test("blocks certificate download until LinkedIn sharing is recorded", () => {
  assert.throws(
    () => assertCertificateDownloadAllowed(
      { userId: "learner-1", linkedinSharedAt: null },
      { id: "learner-1", role: "STUDENT" }
    ),
    /Share this certificate on LinkedIn/
  );
});

test("allows the owner to download after LinkedIn sharing is recorded", () => {
  assert.doesNotThrow(() => assertCertificateDownloadAllowed(
    { userId: "learner-1", linkedinSharedAt: new Date() },
    { id: "learner-1", role: "STUDENT" }
  ));
});

test("renders an immutable certificate snapshot as a PDF", async () => {
  const certificate = {
    certificateNumber: "MAG-2026-TEST0001",
    recipientName: "Test Learner",
    completedAt: new Date("2026-07-26T04:30:00.000Z"),
    course: { title: "AI Execution Systems" },
    contentSnapshot: {
      heading: "Certificate of Completion",
      introText: "This certifies that",
      completionText: "has successfully completed {{courseTitle}}",
      footerText: "Issued by Magnafic Academy",
      verificationText: "Scan to verify this certificate",
      primaryColor: "#000047",
      accentColor: "#12cfe0",
      backgroundImageUrl: null,
      logoUrl: null,
      signatories: [
        {
          name: "Authorized Signatory",
          designation: "Magnafic Academy",
          signatureUrl: null
        }
      ]
    }
  };
  const pdf = await renderCertificatePdf(certificate);

  assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
  assert.ok(pdf.length > 3000);

  const image = await renderCertificateShareImage(certificate);
  assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.ok(image.length > 10000);
});
