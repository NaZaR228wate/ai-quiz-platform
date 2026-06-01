export type CertificatePdfData = {
  platformName: string;
  studentName: string;
  quizName: string;
  score: string;
  completionDate: string;
};

export function downloadCertificatePdf(data: CertificatePdfData) {
  const pdf = createCertificatePdf(data);
  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `certificate-${slugify(data.studentName)}-${slugify(data.quizName)}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function createCertificatePdf(data: CertificatePdfData) {
  const width = 842;
  const height = 595;
  const content = [
    "q",
    "0.96 0.98 1 rg",
    `0 0 ${width} ${height} re f`,
    "0.15 0.39 0.92 RG",
    "3 w",
    "56 56 730 483 re S",
    "Q",
    text(data.platformName, 421, 492, 18, "center"),
    text("Certificate of Completion", 421, 425, 34, "center"),
    text("This certifies that", 421, 365, 15, "center"),
    text(data.studentName, 421, 326, 28, "center"),
    text("completed the quiz", 421, 278, 15, "center"),
    text(data.quizName, 421, 244, 22, "center"),
    text(`Score: ${data.score}`, 421, 190, 18, "center"),
    text(`Completion date: ${data.completionDate}`, 421, 156, 14, "center"),
    text("AI Quiz Platform", 421, 100, 12, "center"),
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return pdf;
}

function text(value: string, x: number, y: number, size: number, align: "left" | "center" = "left") {
  const cleanValue = toPdfText(value);
  const adjustedX = align === "center" ? x - cleanValue.length * size * 0.24 : x;

  return `BT /F1 ${size} Tf 0.06 0.12 0.24 rg ${adjustedX.toFixed(2)} ${y} Td (${escapePdf(cleanValue)}) Tj ET`;
}

function escapePdf(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function toPdfText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
}

function slugify(value: string) {
  const slug = toPdfText(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  return slug || "quiz";
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).length;
}
