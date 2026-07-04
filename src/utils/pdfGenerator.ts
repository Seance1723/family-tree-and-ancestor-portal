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
