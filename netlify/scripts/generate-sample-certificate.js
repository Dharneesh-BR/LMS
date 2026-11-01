import { mkdir, writeFile } from "node:fs/promises";
import {
  renderCertificatePdf,
  renderCertificateShareImage
} from "../src/services/certificate.service.js";

const outputDirectory = new URL("../output/pdf/", import.meta.url);
const pdfOutputFile = new URL("sample-magnafic-certificate.pdf", outputDirectory);
const imageOutputFile = new URL("sample-magnafic-certificate-linkedin.png", outputDirectory);
await mkdir(outputDirectory, { recursive: true });

const certificate = {
  certificateNumber: "MAG-2026-PREVIEW",
  recipientName: "Dharneesh BR",
  completedAt: new Date("2026-07-26T04:30:00.000Z"),
  course: { title: "AI Execution Systems for Brand Teams" },
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

const [pdf, image] = await Promise.all([
  renderCertificatePdf(certificate),
  renderCertificateShareImage(certificate)
]);
await Promise.all([
  writeFile(pdfOutputFile, pdf),
  writeFile(imageOutputFile, image)
]);
console.log(pdfOutputFile.pathname);
console.log(imageOutputFile.pathname);
