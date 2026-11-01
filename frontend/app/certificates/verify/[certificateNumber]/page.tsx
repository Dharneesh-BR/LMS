"use client";

import { useEffect, useState } from "react";
import { BadgeCheck } from "lucide-react";
import { publicApiFetch } from "@/lib/api";

type Certificate = {
  certificateNumber: string;
  recipientName: string;
  courseTitle: string;
  issuedAt: string;
};

export default function CertificateVerification({ params }: { params: { certificateNumber: string } }) {
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setCertificate(null);
    setError("");
    publicApiFetch<{ valid: boolean; certificate: Certificate }>(
      `/api/certificates/verify/${encodeURIComponent(params.certificateNumber)}`
    ).then((result) => {
      if (!result.valid) throw new Error("Certificate could not be verified.");
      if (active) setCertificate(result.certificate);
    }).catch((reason) => {
      if (active) setError(reason instanceof Error ? reason.message : "Certificate verification is unavailable.");
    });
    return () => { active = false; };
  }, [params.certificateNumber]);

  return (
    <section className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-bold text-ink">Certificate Verification</h1>
      {error ? <p role="alert" className="mt-6 text-red-700">{error}</p> : certificate ? (
        <>
          <p className="mt-6 flex items-center gap-2 font-semibold text-green-700"><BadgeCheck aria-hidden="true" className="h-5 w-5" />Verified certificate</p>
          <dl className="mt-6 grid gap-4 border-t border-gray-200 pt-6">
            <div><dt className="text-sm text-gray-600">Recipient</dt><dd className="break-words font-semibold">{certificate.recipientName}</dd></div>
            <div><dt className="text-sm text-gray-600">Course</dt><dd className="break-words font-semibold">{certificate.courseTitle}</dd></div>
            <div><dt className="text-sm text-gray-600">Certificate number</dt><dd className="break-all">{certificate.certificateNumber}</dd></div>
            <div><dt className="text-sm text-gray-600">Issued</dt><dd>{new Date(certificate.issuedAt).toLocaleDateString()}</dd></div>
          </dl>
        </>
      ) : <p role="status" className="mt-6">Verifying certificate...</p>}
    </section>
  );
}
