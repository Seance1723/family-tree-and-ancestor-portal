import { jsPDF } from "jspdf";
import { FamilyMember } from "../types";

export function exportFamilyReportPDF(
  member: FamilyMember & {
    decryptedBirthdate?: string;
    decryptedEmail?: string;
    decryptedPhone?: string;
    decryptedAddress?: string;
  },
  parents: FamilyMember[],
  children: FamilyMember[],
  options: {
    includeContactInfo: boolean;
    includeFamilyTree: boolean;
    includeAnecdotes: boolean;
  },
  calculatedAge: string
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // A4 size: 210mm x 297mm
  let y = 20;
  const marginX = 20;
  const contentWidth = 170; // 210 - 40

  const addSectionHeader = (text: string) => {
    // Check page space
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(37, 99, 235); // blue-600
    doc.text(text.toUpperCase(), marginX, y);
    
    // Line under header
    y += 2;
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.line(marginX, y, marginX + contentWidth, y);
    y += 6;
  };

  const addLabelValue = (label: string, value: string, xOffset = 0) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(label.toUpperCase(), marginX + xOffset, y);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85); // slate-700
    doc.text(value, marginX + xOffset, y + 5);
  };

  // Header Background Deco
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(15, 12, 180, 24, 2, 2, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, 12, 180, 24, 2, 2, "S");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text("GENEALOGICAL FAMILY REPORT", 20, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Symmetric-Key Decrypted Copy • Generated on ${new Date().toLocaleDateString()}`, 20, 27);

  // Lineage Role Badge on Header Right
  doc.setFillColor(239, 246, 255); // blue-50
  doc.roundedRect(150, 16, 40, 16, 2, 2, "F");
  doc.setDrawColor(191, 219, 254); // blue-200
  doc.roundedRect(150, 16, 40, 16, 2, 2, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("LINEAGE ROLE", 154, 21);
  doc.setFontSize(9);
  doc.setTextColor(29, 78, 216); // blue-700
  const roleName = member.relationshipToRoot || "Relative";
  doc.text(roleName.length > 18 ? roleName.substring(0, 17) + "..." : roleName.toUpperCase(), 154, 27);

  y = 48;

  // Basic Information
  addSectionHeader("Primary Identity Profile");
  
  // Grid layout for basic info
  addLabelValue("Full Legal Name", member.name, 0);
  addLabelValue("Calculated Age", calculatedAge, 85);
  y += 12;
  
  addLabelValue("Gender", member.gender || "Unknown", 0);
  addLabelValue("Privacy Setting", member.privacy || "Private", 85);
  y += 16;

  // Personal & Contact details
  if (options.includeContactInfo) {
    addSectionHeader("Personal & Historical Details");
    
    addLabelValue("Birthdate", member.decryptedBirthdate || "Not Recorded", 0);
    addLabelValue("Birthplace", member.birthplace || "Not Recorded", 85);
    y += 12;

    addLabelValue("Secure Email", member.decryptedEmail || "None registered", 0);
    addLabelValue("Secure Phone Line", member.decryptedPhone || "None registered", 85);
    y += 12;

    // Address handles wrapping
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("HISTORICAL ADDRESS", marginX, y);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    const addressLines = doc.splitTextToSize(member.decryptedAddress || "None registered", contentWidth);
    doc.text(addressLines, marginX, y + 5);
    y += (addressLines.length * 5) + 8;
  }

  // Connections
  if (options.includeFamilyTree) {
    addSectionHeader("Family Tree Network & Connections");
    
    // Parents
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("PARENTS", marginX, y);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    if (parents.length > 0) {
      parents.forEach((p, idx) => {
        doc.text(`• ${p.name}`, marginX, y + 5 + (idx * 5));
      });
      y += (parents.length * 5) + 8;
    } else {
      doc.text("No connections logged", marginX, y + 5);
      y += 12;
    }

    // Children
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("CHILDREN", marginX, y);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    if (children.length > 0) {
      children.forEach((c, idx) => {
        doc.text(`• ${c.name}`, marginX, y + 5 + (idx * 5));
      });
      y += (children.length * 5) + 8;
    } else {
      doc.text("No connections logged", marginX, y + 5);
      y += 12;
    }
  }

  // Anecdotes
  if (options.includeAnecdotes) {
    addSectionHeader("Historical Anecdotes & Notes");
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105); // slate-600
    
    const notesText = member.notes || "No historical anecdotes or personal journal entries have been recorded for this ancestor/member.";
    const notesLines = doc.splitTextToSize(notesText, contentWidth);
    
    // Draw rounded background container
    const containerHeight = (notesLines.length * 4.5) + 8;
    
    // Check page overflow
    if (y + containerHeight > 260) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(241, 245, 249); // slate-100
    doc.roundedRect(marginX - 2, y - 2, contentWidth + 4, containerHeight, 2, 2, "FD");
    
    doc.text(notesLines, marginX, y + 4);
    y += containerHeight + 10;
  }

  // Footer at bottom of all pages (drawn individually on current page)
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(marginX, 272, marginX + contentWidth, 272);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("This record is secured using end-to-end symmetric client-side encryption. Only authorized key-holders can decrypt this copy.", marginX, 277);
    doc.text(`Record ID: ${member.id}  |  Kinly Ancestry Vault Platform  |  Page ${i} of ${totalPages}`, marginX, 282);
  }

  // Trigger Save File
  const filename = `${member.name.replace(/\s+/g, "_")}_Family_Report.pdf`;
  doc.save(filename);
}

export function exportInvoicePDF(payment: {
  invoiceId: string;
  type: "Subscription" | "Donation";
  amount: number;
  date: number;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  userEmail: string;
  displayName?: string;
  slots?: number;
}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const marginX = 20;
  const contentWidth = 170;

  // Header Background Decoration
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(15, 12, 180, 24, 2, 2, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, 12, 180, 24, 2, 2, "S");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text("INVOICE / RECEIPT", 20, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Official Payment Voucher • Generated on ${new Date().toLocaleDateString()}`, 20, 27);

  // Logo Badge on Header Right
  doc.setFillColor(254, 243, 199); // amber-100
  doc.roundedRect(150, 16, 40, 16, 2, 2, "F");
  doc.setDrawColor(251, 191, 36); // amber-400
  doc.roundedRect(150, 16, 40, 16, 2, 2, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(180, 83, 9); // amber-700
  doc.text("KINLY VAULT", 155, 26);

  let y = 48;

  // Invoice Details Metadata
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(37, 99, 235); // blue-600
  doc.text("INVOICE METADATA", marginX, y);
  
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(marginX, y + 2, marginX + contentWidth, y + 2);
  y += 8;

  // Metadata Fields
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("INVOICE NUMBER", marginX, y);
  doc.text("TRANSACTION DATE", marginX + 85, y);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(payment.invoiceId, marginX, y + 5);
  doc.text(new Date(payment.date).toLocaleString(), marginX + 85, y + 5);
  y += 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("RAZORPAY ORDER ID", marginX, y);
  doc.text("RAZORPAY PAYMENT ID", marginX + 85, y);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(payment.razorpayOrderId || "N/A", marginX, y + 5);
  doc.text(payment.razorpayPaymentId || "N/A", marginX + 85, y + 5);
  y += 18;

  // Billing Party Details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(37, 99, 235);
  doc.text("BILL TO (PAYER)", marginX, y);
  doc.line(marginX, y + 2, marginX + contentWidth, y + 2);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("PAYER EMAIL", marginX, y);
  doc.text("ACCOUNT NAME", marginX + 85, y);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(payment.userEmail, marginX, y + 5);
  doc.text(payment.displayName || payment.userEmail.split("@")[0], marginX + 85, y + 5);
  y += 18;

  // Invoice Items Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(37, 99, 235);
  doc.text("LINE ITEMS", marginX, y);
  doc.line(marginX, y + 2, marginX + contentWidth, y + 2);
  y += 8;

  // Table Headers
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(marginX, y, contentWidth, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("DESCRIPTION", marginX + 3, y + 5);
  doc.text("QTY", marginX + 110, y + 5);
  doc.text("UNIT PRICE", marginX + 130, y + 5);
  doc.text("TOTAL", marginX + 152, y + 5);
  y += 7;

  // Line Item Data
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  
  const desc = payment.type === "Subscription"
    ? `Kinly Premium Subscription Upgrade (${payment.slots || 50} Tree Slots Allocated)`
    : `Support Contribution - General Donation for Platform Operations`;
  
  doc.text(desc, marginX + 3, y + 6);
  doc.text("1", marginX + 112, y + 6);
  doc.text(`INR ${payment.amount}`, marginX + 130, y + 6);
  doc.text(`INR ${payment.amount}`, marginX + 152, y + 6);
  
  doc.setDrawColor(241, 245, 249);
  doc.line(marginX, y + 9, marginX + contentWidth, y + 9);
  y += 16;

  // Total Paid
  doc.setFillColor(248, 250, 252);
  doc.rect(marginX + 95, y, 75, 20, "F");
  doc.setDrawColor(226, 232, 240);
  doc.rect(marginX + 95, y, 75, 20, "S");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("SUBTOTAL:", marginX + 99, y + 6);
  doc.text(`INR ${payment.amount}`, marginX + 139, y + 6);

  doc.text("TAXES (0%):", marginX + 99, y + 11);
  doc.text("INR 0.00", marginX + 139, y + 11);

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("TOTAL PAID:", marginX + 99, y + 16);
  doc.text(`INR ${payment.amount}`, marginX + 139, y + 16);
  y += 32;

  // Invoice Footer
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(marginX, 265, marginX + contentWidth, 265);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("Kinly Zero-Knowledge Family Vault Platform", marginX, 270);
  doc.text("This is a computer-generated voucher and serves as an official receipt of transaction.", marginX, 274);
  doc.text("If you have questions regarding this receipt, please submit a ticket in the Support tab.", marginX, 278);

  const filename = `${payment.invoiceId}.pdf`;
  doc.save(filename);
}
