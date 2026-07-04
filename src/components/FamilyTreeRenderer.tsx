import React, { useState, useMemo } from "react";
import { FamilyMember, Gender, PrivacySetting } from "../types";
import { Plus, User, Heart, ArrowUp, Shield, Download, Trash2, ZoomIn, ZoomOut, Maximize2, FileJson, FileSpreadsheet, Sliders } from "lucide-react";
import { decryptData } from "../utils/crypto";
import { motion, AnimatePresence } from "motion/react";

interface FamilyTreeRendererProps {
  members: FamilyMember[];
  selectedMemberId: string | null;
  onSelectMember: (id: string) => void;
  onAddRelative: (member: FamilyMember, relationType: "father" | "mother" | "sibling" | "child") => void;
  masterKey: string;
  onDeleteMembers?: (ids: string[]) => Promise<void> | void;
  searchQuery?: string;
  collapsedBranches?: string[];
  onToggleCollapseBranch?: (id: string) => void;
}

export default function FamilyTreeRenderer({
  members,
  selectedMemberId,
  onSelectMember,
  onAddRelative,
  masterKey,
  onDeleteMembers,
  searchQuery = "",
  collapsedBranches = [],
  onToggleCollapseBranch,
}: FamilyTreeRendererProps) {
  // Bulk Delete States
  const [isBulkDeleteMode, setIsBulkDeleteMode] = useState(false);
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Pan and Zoom States
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Generations Visibility Limit State
  const [ancestorGenerations, setAncestorGenerations] = useState(2); // 0, 1, 2
  const [descendantGenerations, setDescendantGenerations] = useState(1); // 0, 1

  const toggleBulkSelect = (id: string) => {
    setSelectedBulkIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const memberMap = useMemo(() => {
    const map = new Map<string, FamilyMember>();
    members.forEach((m) => map.set(m.id, m));
    return map;
  }, [members]);

  const activeMember = useMemo(() => {
    if (!selectedMemberId) return members[0] || null;
    return memberMap.get(selectedMemberId) || members[0] || null;
  }, [selectedMemberId, members, memberMap]);

  const isMatched = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return new Set<string>();
    const q = searchQuery.toLowerCase().trim();
    const matches = new Set<string>();
    members.forEach((m) => {
      if (
        m.name.toLowerCase().includes(q) ||
        (m.relationshipToRoot && m.relationshipToRoot.toLowerCase().includes(q)) ||
        (m.birthplace && m.birthplace.toLowerCase().includes(q))
      ) {
        matches.add(m.id);
      }
    });
    return matches;
  }, [members, searchQuery]);

  // Find Parents
  const father = activeMember ? activeMember.parents.map((pid) => memberMap.get(pid)).find((p) => p?.gender === Gender.MALE) : undefined;
  const mother = activeMember ? activeMember.parents.map((pid) => memberMap.get(pid)).find((p) => p?.gender === Gender.FEMALE) : undefined;

  // Find Grandparents (Father's side)
  const paternalGrandfather = father ? father.parents.map((pid) => memberMap.get(pid)).find((p) => p?.gender === Gender.MALE) : undefined;
  const paternalGrandmother = father ? father.parents.map((pid) => memberMap.get(pid)).find((p) => p?.gender === Gender.FEMALE) : undefined;

  // Find Grandparents (Mother's side)
  const maternalGrandfather = mother ? mother.parents.map((pid) => memberMap.get(pid)).find((p) => p?.gender === Gender.MALE) : undefined;
  const maternalGrandmother = mother ? mother.parents.map((pid) => memberMap.get(pid)).find((p) => p?.gender === Gender.FEMALE) : undefined;

  // Find Siblings
  const siblings = useMemo(() => {
    if (!activeMember) return [];
    return members.filter((m) => {
      if (m.id === activeMember.id) return false;
      const sharedParents = m.parents.some((pId) => activeMember.parents.includes(pId));
      const isExplicitSibling = activeMember.siblings.includes(m.id) || m.siblings.includes(activeMember.id);
      return sharedParents || isExplicitSibling;
    });
  }, [members, activeMember]);

  // Find Children
  const children = useMemo(() => {
    if (!activeMember) return [];
    return members.filter((m) => {
      return m.parents.includes(activeMember.id) || activeMember.children.includes(m.id);
    });
  }, [members, activeMember]);

  // Drag-to-pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input") || target.closest(".cursor-pointer")) {
      return;
    }
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY;
    setZoom((prevZoom) => {
      const newZoom = prevZoom - delta * 0.001;
      return Math.min(Math.max(newZoom, 0.45), 1.8);
    });
  };

  const resetPanZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Structured Branch Data Export: JSON
  const handleExportJSON = () => {
    if (!activeMember) return;
    const branchMembers = [
      activeMember,
      father, mother,
      paternalGrandfather, paternalGrandmother,
      maternalGrandfather, maternalGrandmother,
      ...siblings,
      ...children
    ].filter((m): m is FamilyMember => !!m);

    // Filter duplicates by unique ID
    const uniqueMembers = Array.from(new Map(branchMembers.map(m => [m.id, m])).values());

    const decryptedList = uniqueMembers.map(m => ({
      id: m.id,
      name: m.name,
      gender: m.gender,
      relationship: m.id === activeMember.id ? "Center Ancestor" : (m.relationshipToRoot || "Relative"),
      birthdate: decryptData(m.birthdate, masterKey) || "Unknown",
      birthplace: m.birthplace || "Unknown",
      email: decryptData(m.contactEmail, masterKey) || "N/A",
      phone: decryptData(m.contactPhone, masterKey) || "N/A",
      address: decryptData(m.address, masterKey) || "N/A",
      privacy: m.privacy,
      notes: m.notes || ""
    }));

    const blob = new Blob([JSON.stringify(decryptedList, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeMember.name.replace(/\s+/g, "_")}_branch_data.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Structured Branch Data Export: CSV
  const handleExportCSV = () => {
    if (!activeMember) return;
    const branchMembers = [
      activeMember,
      father, mother,
      paternalGrandfather, paternalGrandmother,
      maternalGrandfather, maternalGrandmother,
      ...siblings,
      ...children
    ].filter((m): m is FamilyMember => !!m);

    const uniqueMembers = Array.from(new Map(branchMembers.map(m => [m.id, m])).values());

    const headers = ["ID", "Name", "Gender", "Relationship", "Birthdate", "Birthplace", "Email", "Phone", "Address", "Privacy", "Notes"];
    const rows = uniqueMembers.map(m => [
      m.id,
      m.name,
      m.gender,
      m.id === activeMember.id ? "Center Ancestor" : (m.relationshipToRoot || "Relative"),
      decryptData(m.birthdate, masterKey) || "Unknown",
      m.birthplace || "Unknown",
      decryptData(m.contactEmail, masterKey) || "N/A",
      decryptData(m.contactPhone, masterKey) || "N/A",
      decryptData(m.address, masterKey) || "N/A",
      m.privacy,
      (m.notes || "").replace(/"/g, '""').replace(/\n/g, " ")
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${val}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeMember.name.replace(/\s+/g, "_")}_branch_data.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export HTML for Printing
  const handlePrintExport = () => {
    if (!activeMember) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const decrypt = (val: string) => decryptData(val, masterKey);

    const membersHtml = members
      .map(
        (m) => `
      <div style="border: 1px solid #ddd; padding: 12px; margin-bottom: 10px; border-radius: 6px; page-break-inside: avoid;">
        <h3 style="margin: 0; color: #111;">${m.name} (${m.relationshipToRoot || "Relative"})</h3>
        <p style="margin: 4px 0; color: #555;">Born: ${decrypt(m.birthdate) || "Unknown"} | Place: ${m.birthplace || "Unknown"}</p>
        <p style="margin: 4px 0; color: #555;">Contact: ${decrypt(m.contactEmail) || "N/A"} | ${decrypt(m.contactPhone) || "N/A"}</p>
        <p style="margin: 4px 0; color: #555;">Address: ${decrypt(m.address) || "N/A"}</p>
        ${m.notes ? `<p style="margin: 4px 0; font-style: italic; color: #666;">Note: ${m.notes}</p>` : ""}
      </div>
    `
      )
      .join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Family Tree Export - ${activeMember.name}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #333; }
            h1 { text-align: center; margin-bottom: 30px; }
            .meta { text-align: center; color: #666; margin-bottom: 40px; }
            .grid { max-width: 800px; margin: 0 auto; }
          </style>
        </head>
        <body>
          <h1>The Family Lineage of ${activeMember.name}</h1>
          <div class="meta">Exported on ${new Date().toLocaleDateString()} | Total Members Mapped: ${members.length}</div>
          <div class="grid">
            ${membersHtml}
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getGenderColor = (gender: Gender) => {
    if (gender === Gender.MALE) return "border-blue-200 bg-blue-50/80 hover:bg-blue-100";
    if (gender === Gender.FEMALE) return "border-rose-200 bg-rose-50/80 hover:bg-rose-100";
    return "border-emerald-200 bg-emerald-50/80 hover:bg-emerald-100";
  };

  const renderNode = (m: FamilyMember | undefined, label: string, relationType: "father" | "mother" | "sibling" | "child" | null) => {
    if (!m) {
      if (!relationType) return <div className="h-24 w-44"></div>;
      return (
        <motion.button
          layout
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.2 }}
          id={`add-relative-${label}`}
          disabled={isBulkDeleteMode}
          onClick={() => onAddRelative(activeMember, relationType)}
          className={`h-24 w-44 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 hover:bg-white hover:border-blue-500 hover:shadow-sm transition-all duration-300 group ${
            isBulkDeleteMode ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          <Plus className="h-5 w-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
          <span className="text-xs text-slate-500 font-sans mt-1 group-hover:text-blue-600 font-medium">Add {label}</span>
        </motion.button>
      );
    }

    const isSelected = m.id === activeMember?.id;
    const isChecked = selectedBulkIds.includes(m.id);
    const decryptedBirth = decryptData(m.birthdate, masterKey);
    const isMatchedNode = isMatched.has(m.id);

    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.92, y: 5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: -5 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        id={`member-node-${m.id}`}
        onClick={(e) => {
          if (isBulkDeleteMode) {
            e.stopPropagation();
            toggleBulkSelect(m.id);
          } else {
            onSelectMember(m.id);
          }
        }}
        className={`h-24 w-44 p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all duration-300 relative ${
          isBulkDeleteMode
            ? isChecked
              ? "border-rose-500 bg-rose-50/60 shadow-md ring-2 ring-rose-500/20 scale-102 z-10"
              : getGenderColor(m.gender) + " hover:border-slate-400 opacity-80"
            : isSelected 
              ? "border-blue-600 bg-blue-50 shadow-md ring-2 ring-blue-600/20 scale-105 z-10 font-medium" 
              : isMatchedNode
                ? "border-amber-500 bg-amber-50 shadow-xl ring-4 ring-amber-400/50 scale-105 z-20 font-semibold border-2"
                : getGenderColor(m.gender) + " hover:shadow-md hover:scale-102"
        }`}
      >
        {isBulkDeleteMode && (
          <div className="absolute top-2 right-2 z-20" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => toggleBulkSelect(m.id)}
              className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 bg-white cursor-pointer"
            />
          </div>
        )}

        <div className="flex items-start justify-between">
          <div className="truncate pr-1">
            <h4 className="font-sans font-semibold text-xs text-gray-900 truncate flex items-center gap-1">
              <span>{m.name}</span>
              {isMatchedNode && (
                <span className="bg-amber-500 text-white text-[8px] font-extrabold px-1 rounded uppercase tracking-wider scale-90 inline-block shrink-0 animate-pulse">Match</span>
              )}
            </h4>
            <p className="font-mono text-[10px] text-gray-500 mt-0.5 truncate">{m.relationshipToRoot || label}</p>
          </div>
          {!isBulkDeleteMode && (
            <div className={`p-1 rounded-full ${m.gender === Gender.MALE ? "bg-blue-100 text-blue-700" : m.gender === Gender.FEMALE ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
              <User className="h-3.5 w-3.5" />
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between text-[10px] text-gray-500 border-t border-gray-100/50 pt-1">
          <span className="truncate">{decryptedBirth || "—"}</span>
          <span className="text-gray-400 text-[9px] uppercase tracking-wider font-semibold">
            {m.privacy === PrivacySetting.PUBLIC ? "Public" : m.privacy === PrivacySetting.FAMILY ? "Family" : "Private"}
          </span>
        </div>

        {/* Sync Status Badge */}
        {!isBulkDeleteMode && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] shadow-sm border border-gray-100">
            {m.synced ? "☁️" : "💾"}
          </span>
        )}
      </motion.div>
    );
  };

  // Empty State if activeMember doesn't exist
  if (!activeMember) {
    return (
      <div className="flex flex-col items-center justify-center h-96 border border-dashed border-gray-300 rounded-2xl bg-white p-8 text-center">
        <User className="h-12 w-12 text-gray-400 mb-4 animate-pulse" />
        <h3 className="font-sans font-medium text-lg text-gray-900">Start Your Tree</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-sm">
          Add your own information to begin growing your family tree and mapping your lineage.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Utilities */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <h3 className="font-sans font-semibold text-slate-900 flex items-center gap-2 flex-wrap">
            <span>Visual Family Tree Navigator</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              Interactive View
            </span>
            {isBulkDeleteMode && (
              <span className="text-xs bg-rose-100 text-rose-700 px-2.5 py-0.5 rounded-full font-bold animate-pulse">
                Bulk Selection Active
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-500">
            {isBulkDeleteMode 
              ? "Select nodes below to queue them, then click 'Delete Selected' to clear them from database."
              : "Drag empty canvas to Pan. Scroll mouse-wheel to Zoom. Click any relative to center the lineage."}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!isBulkDeleteMode ? (
            <button
              id="btn-enable-bulk"
              onClick={() => {
                setIsBulkDeleteMode(true);
                setSelectedBulkIds([]);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50/20 text-xs font-semibold text-slate-700 hover:text-rose-600 shadow-xs transition-all cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
              <span>Bulk Delete</span>
            </button>
          ) : (
            <>
              <button
                id="btn-cancel-bulk"
                onClick={() => {
                  setIsBulkDeleteMode(false);
                  setSelectedBulkIds([]);
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer transition-all"
              >
                Cancel Bulk
              </button>
              <button
                id="btn-delete-selected"
                disabled={selectedBulkIds.length === 0}
                onClick={() => setShowConfirmation(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white shadow-xs transition-all ${
                  selectedBulkIds.length > 0
                    ? "bg-rose-600 hover:bg-rose-700 cursor-pointer"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Selected ({selectedBulkIds.length})</span>
              </button>
            </>
          )}

          {/* Structured Data Exports */}
          <button
            id="btn-export-json"
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-xs font-semibold text-slate-700 shadow-xs transition-all hover:bg-slate-50 cursor-pointer"
            title="Export Decrypted Branch Data as JSON"
          >
            <FileJson className="h-3.5 w-3.5 text-blue-500" />
            <span>Export JSON</span>
          </button>
          
          <button
            id="btn-export-csv"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-xs font-semibold text-slate-700 shadow-xs transition-all hover:bg-slate-50 cursor-pointer"
            title="Export Decrypted Branch Data as CSV spreadsheet"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
            <span>Export CSV</span>
          </button>

          <button
            id="btn-print-export"
            onClick={handlePrintExport}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-xs font-semibold text-slate-700 shadow-xs transition-all hover:bg-slate-50 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Print Sheet</span>
          </button>
        </div>
      </div>

      {/* Generations View Limit Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 shadow-xs">
        <div className="space-y-1">
          <h4 className="font-sans font-bold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wide">
            <Sliders className="h-4 w-4 text-blue-600" />
            <span>Generations Visibility Control</span>
          </h4>
          <p className="text-[11px] text-slate-500">
            Dynamically filter ancestral and descendant branches to simplify large tree visualization.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-6">
          {/* Ancestor generations slider */}
          <div className="flex flex-col gap-1 sm:w-48">
            <div className="flex justify-between text-[11px] font-semibold text-slate-600">
              <span>Ancestors shown:</span>
              <span className="font-mono text-blue-600 font-bold">
                {ancestorGenerations === 0 ? "None (Self Only)" : ancestorGenerations === 1 ? "1 (Parents)" : "2 (Grandparents)"}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="1"
              value={ancestorGenerations}
              onChange={(e) => setAncestorGenerations(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          {/* Descendant generations slider */}
          <div className="flex flex-col gap-1 sm:w-48">
            <div className="flex justify-between text-[11px] font-semibold text-slate-600">
              <span>Descendants shown:</span>
              <span className="font-mono text-blue-600 font-bold">
                {descendantGenerations === 0 ? "None" : "1 Generation"}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="1"
              value={descendantGenerations}
              onChange={(e) => setDescendantGenerations(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>
        </div>
      </div>

      {/* Visual Hierarchy Tree Diagram Box */}
      <div className="relative w-full border border-slate-200/80 rounded-3xl bg-slate-50/50 overflow-hidden min-h-[500px]">
        
        {/* Floating Pan/Zoom Controls */}
        <div className="absolute bottom-4 right-4 z-30 flex items-center gap-1.5 bg-white/95 backdrop-blur-xs p-1.5 rounded-2xl border border-slate-200 shadow-lg">
          <button
            onClick={() => setZoom(prev => Math.min(prev + 0.1, 1.8))}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.45))}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={resetPanZoom}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer transition-colors"
            title="Reset Pan & Zoom"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>

        {/* Grab-to-pan / Mouse-wheel canvas area */}
        <div 
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className={`w-full h-full min-h-[500px] p-6 pb-12 pt-8 flex items-center justify-center select-none ${
            isPanning ? "cursor-grabbing" : "cursor-grab"
          }`}
        >
          {/* Transforming Tree Element */}
          <motion.div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "center center",
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="flex flex-col items-center gap-10 min-w-[700px] origin-center"
          >
            
            {/* Generation 1: Grandparents (Top level) */}
            {ancestorGenerations >= 2 && (
              <>
                <div className="flex gap-12 justify-center w-full">
                  {/* Paternal Side */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      {renderNode(paternalGrandfather, "Paternal G-Father", null)}
                      <span className="text-[9px] font-mono text-gray-400 mt-1">Paternal Grandfather</span>
                    </div>
                    <div className="flex flex-col items-center">
                      {renderNode(paternalGrandmother, "Paternal G-Mother", null)}
                      <span className="text-[9px] font-mono text-gray-400 mt-1">Paternal Grandmother</span>
                    </div>
                  </div>

                  {/* Split Gap */}
                  <div className="w-8 border-r border-dashed border-gray-300"></div>

                  {/* Maternal Side */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      {renderNode(maternalGrandfather, "Maternal G-Father", null)}
                      <span className="text-[9px] font-mono text-gray-400 mt-1">Maternal Grandfather</span>
                    </div>
                    <div className="flex flex-col items-center">
                      {renderNode(maternalGrandmother, "Maternal G-Mother", null)}
                      <span className="text-[9px] font-mono text-gray-400 mt-1">Maternal Grandmother</span>
                    </div>
                  </div>
                </div>

                {/* Connection Lines G1 -> G2 */}
                <div className="w-full flex justify-around -my-6 h-6 pointer-events-none">
                  <div className="w-1/2 flex justify-center">
                    <div className="h-full w-0.5 bg-gray-300"></div>
                  </div>
                  <div className="w-1/2 flex justify-center">
                    <div className="h-full w-0.5 bg-gray-300"></div>
                  </div>
                </div>
              </>
            )}

            {/* Generation 2: Parents */}
            {ancestorGenerations >= 1 && (
              <>
                <div className="flex gap-24 justify-center">
                  <div className="flex flex-col items-center relative">
                    {renderNode(father, "Father", "father")}
                    <span className="text-xs font-semibold text-gray-600 mt-1">Father</span>
                  </div>
                  
                  <div className="flex items-center justify-center -mx-12 pointer-events-none">
                    <Heart className="h-5 w-5 text-rose-400 fill-rose-50" />
                  </div>

                  <div className="flex flex-col items-center">
                    {renderNode(mother, "Mother", "mother")}
                    <span className="text-xs font-semibold text-gray-600 mt-1">Mother</span>
                  </div>
                </div>

                {/* Connection Line G2 -> G3 */}
                <div className="h-6 w-0.5 bg-blue-400 -my-6 pointer-events-none"></div>
              </>
            )}

            {/* Generation 3: Selected Center Node & Siblings */}
            <div className="flex gap-8 justify-center items-center">
              {/* Siblings Left */}
              <AnimatePresence>
                {siblings.slice(0, 2).map((sib) => (
                  <motion.div
                    key={sib.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8, x: -20 }}
                    animate={{ opacity: 0.9, scale: 0.95, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: -20 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="flex flex-col items-center"
                  >
                    {renderNode(sib, "Sibling", null)}
                    <span className="text-[10px] text-gray-500 mt-1">Sibling</span>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Selected Active Member Center */}
              <motion.div
                layout
                className="flex flex-col items-center border-4 border-blue-500/25 p-1 rounded-2xl bg-white shadow-xl"
              >
                {renderNode(activeMember, "Active Member", null)}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs font-bold text-blue-700 flex items-center gap-1">
                    <ArrowUp className="h-3 w-3 animate-bounce" /> Center Node
                  </span>
                  {children.length > 0 && onToggleCollapseBranch && (
                    <button
                      id="btn-toggle-branch-node"
                      onClick={() => onToggleCollapseBranch(activeMember.id)}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold border border-slate-200 transition-colors cursor-pointer"
                      title={collapsedBranches.includes(activeMember.id) ? "Expand Children Branches" : "Collapse Children Branches"}
                    >
                      {collapsedBranches.includes(activeMember.id) ? "Expand" : "Collapse"} ({children.length})
                    </button>
                  )}
                </div>
              </motion.div>

              {/* Siblings Right */}
              <AnimatePresence>
                {siblings.slice(2).map((sib) => (
                  <motion.div
                    key={sib.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8, x: 20 }}
                    animate={{ opacity: 0.9, scale: 0.95, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: 20 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="flex flex-col items-center"
                  >
                    {renderNode(sib, "Sibling", null)}
                    <span className="text-[10px] text-gray-500 mt-1">Sibling</span>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Add Sibling Button */}
              <div className="flex flex-col items-center">
                {renderNode(undefined, "Sibling", "sibling")}
              </div>
            </div>

            {/* Connection Line G3 -> G4 */}
            {descendantGenerations >= 1 && (
              <div className="h-6 w-0.5 bg-gray-300 -my-6 pointer-events-none"></div>
            )}

            {/* Generation 4: Children */}
            {descendantGenerations >= 1 && (
              <div className="flex gap-6 justify-center min-h-[120px]">
                <AnimatePresence mode="popLayout">
                  {collapsedBranches.includes(activeMember.id) ? (
                    <motion.div
                      key="collapsed-children"
                      initial={{ opacity: 0, scale: 0.8, y: -15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: -15 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      className="flex flex-col items-center bg-amber-50/50 border border-dashed border-amber-300/80 p-4 rounded-2xl max-w-sm text-center shadow-xs"
                    >
                      <span className="text-xs font-semibold text-amber-800">Children Branches Collapsed</span>
                      <span className="text-[10px] text-amber-600/80 mt-0.5">Total direct descendants: {children.length}</span>
                      {onToggleCollapseBranch && (
                        <button
                          id="btn-expand-children-placeholder"
                          onClick={() => onToggleCollapseBranch(activeMember.id)}
                          className="mt-2 px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] font-bold rounded-lg border border-amber-200 transition-colors cursor-pointer"
                        >
                          Expand branches
                        </button>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="expanded-children"
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 20 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      className="flex gap-6 justify-center"
                    >
                      {children.map((child) => (
                        <motion.div
                          key={child.id}
                          layout
                          initial={{ opacity: 0, scale: 0.8, y: 15 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.8, y: 15 }}
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                          className="flex flex-col items-center"
                        >
                          {renderNode(child, "Child", null)}
                          <span className="text-xs text-gray-500 mt-1">Child</span>
                        </motion.div>
                      ))}
                      
                      {/* Add Child Button */}
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center"
                      >
                        {renderNode(undefined, "Child", "child")}
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

          </motion.div>
        </div>
      </div>

      {/* Bulk Delete confirmation modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-3xl border border-slate-200 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-sans font-bold text-base text-slate-900 flex items-center gap-2">
              <Shield className="h-5 w-5 text-rose-500 shrink-0" /> Confirm Bulk Deletion
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to permanently delete the following <strong>{selectedBulkIds.length}</strong> family members? This will remove them and clear all their direct connections in your tree. This action is irreversible.
            </p>
            <div className="max-h-36 overflow-y-auto bg-slate-50 rounded-2xl p-3 border border-slate-100 space-y-1.5">
              {selectedBulkIds.map(id => {
                const m = memberMap.get(id);
                return (
                  <div key={id} className="text-xs text-slate-700 font-medium flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                    <span>{m?.name || "Unknown Member"} ({m?.relationshipToRoot || "Relative"})</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (onDeleteMembers) {
                    await onDeleteMembers(selectedBulkIds);
                  }
                  setSelectedBulkIds([]);
                  setIsBulkDeleteMode(false);
                  setShowConfirmation(false);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer transition-colors"
              >
                Yes, Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
