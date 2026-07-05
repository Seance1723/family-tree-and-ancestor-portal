import React, { useState, useRef } from "react";
import { HistoricalDocument, FamilyMember } from "../../types";
import { FileText, Plus, Trash2, Calendar, Tag, Image as ImageIcon, Link, Search } from "lucide-react";

interface DocumentManagerProps {
  documents: HistoricalDocument[];
  members: FamilyMember[];
  onAddDoc: (doc: HistoricalDocument) => void;
  onDeleteDoc: (doc: HistoricalDocument) => void;
}

export default function DocumentManager({
  documents,
  members,
  onAddDoc,
  onDeleteDoc,
}: DocumentManagerProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [fileData, setFileData] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [linkedMemberIds, setLinkedMemberIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setFileData(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (t: string) => {
    setTags(tags.filter((tag) => tag !== t));
  };

  const toggleLinkedMember = (id: string) => {
    if (linkedMemberIds.includes(id)) {
      setLinkedMemberIds(linkedMemberIds.filter((mId) => mId !== id));
    } else {
      setLinkedMemberIds([...linkedMemberIds, id]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newDoc: HistoricalDocument = {
      id: "doc_" + Math.random().toString(36).substr(2, 9),
      userId: "", // Will be assigned by sync engine
      title,
      description,
      date: date || new Date().toISOString().split("T")[0],
      fileData: fileData || "", // Can be empty or base64 image
      tags,
      linkedMemberIds,
      createdAt: Date.now(),
    };

    onAddDoc(newDoc);
    
    // Reset form
    setTitle("");
    setDescription("");
    setDate("");
    setFileData("");
    setTags([]);
    setLinkedMemberIds([]);
  };

  const filteredDocs = documents.filter((doc) => {
    const query = searchQuery.toLowerCase();
    return (
      doc.title.toLowerCase().includes(query) ||
      doc.description.toLowerCase().includes(query) ||
      doc.tags.some((t) => t.toLowerCase().includes(query))
    );
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Document Archiver Form */}
      <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 h-fit">
        <div>
          <h3 className="font-sans font-semibold text-slate-900 text-base">Archive Historical Record</h3>
          <p className="text-xs text-slate-500 mt-1">
            Store scanned birth certificates, letters, census files, or vintage photos safely.
          </p>
        </div>

        <form id="archive-document-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Document Title *</label>
            <input
              id="doc-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Grandfather John's Birth Certificate"
              className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-blue-600 font-sans"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Description / Transcript</label>
            <textarea
              id="doc-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add translation, context, transcript, or details..."
              className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-blue-600 font-sans resize-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Estimated Document Date</label>
            <div className="relative">
              <input
                id="doc-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 focus:outline-blue-600 font-sans"
              />
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            </div>
          </div>

          {/* DRAG AND DROP FILE UPLOAD (Both click and drag-and-drop support) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Upload Certificate / Photo</label>
            <div
              id="drop-zone"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                isDragging 
                  ? "border-blue-500 bg-blue-50" 
                  : fileData 
                    ? "border-emerald-300 bg-emerald-50/20" 
                    : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
              }`}
            >
              <input
                id="file-input"
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              {fileData ? (
                <div className="flex flex-col items-center gap-2">
                  <img src={fileData} alt="Uploaded preview" className="h-24 w-auto rounded-lg shadow-sm object-cover" />
                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    ✓ Photo uploaded successfully
                  </span>
                </div>
              ) : (
                <div className="space-y-1">
                  <ImageIcon className="h-8 w-8 text-gray-400 mx-auto" />
                  <p className="text-xs font-medium text-gray-700">Drag & Drop or Click to Upload</p>
                  <p className="text-[10px] text-gray-500">Supports PNG, JPG (Safe local compression)</p>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Archive Tags</label>
            <div className="flex gap-2">
              <input
                id="doc-tags"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="e.g., Certificate, Wedding, Census"
                className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-blue-600 font-sans"
              />
              <button
                id="btn-add-tag"
                type="button"
                onClick={addTag}
                className="px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold cursor-pointer"
              >
                Add
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-medium">
                    {t}
                    <button id={`btn-remove-tag-${t}`} type="button" onClick={() => removeTag(t)} className="hover:text-red-600 font-bold ml-0.5">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Link to Family Member */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">Link to Family Members</label>
            <div className="max-h-28 overflow-y-auto border border-slate-100 rounded-xl p-2 space-y-1 divide-y divide-slate-50 bg-slate-50/20">
              {members.length === 0 ? (
                <p className="text-[10px] text-slate-400 p-1">No family members found to link.</p>
              ) : (
                members.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 py-1 px-1 text-xs cursor-pointer hover:bg-slate-50">
                    <input
                      id={`chk-link-member-${m.id}`}
                      type="checkbox"
                      checked={linkedMemberIds.includes(m.id)}
                      onChange={() => toggleLinkedMember(m.id)}
                      className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                    />
                    <span className="text-slate-700 font-sans text-[11px] truncate">{m.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <button
            id="btn-submit-doc"
            type="submit"
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
          >
            File in Archive
          </button>
        </form>
      </div>

      {/* Archive Catalog Display */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-xs">
            <input
              id="search-docs"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents or tags..."
              className="w-full text-xs pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 focus:outline-blue-600 font-sans bg-white"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Showing {filteredDocs.length} of {documents.length} Records
          </span>
        </div>

        {filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-80 border border-dashed border-slate-200 rounded-2xl bg-white p-8 text-center">
            <FileText className="h-10 w-10 text-slate-400 mb-3" />
            <h4 className="font-sans font-medium text-sm text-slate-900">No Archives Found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Clear your filters or record historical documents first to populate your catalog.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredDocs.map((doc) => {
              const linkedNames = doc.linkedMemberIds
                .map((id) => members.find((m) => m.id === id)?.name)
                .filter(Boolean);

              return (
                <div key={doc.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
                  <div className="space-y-3">
                    {doc.fileData && (
                      <div className="w-full h-32 rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
                        <img src={doc.fileData} alt={doc.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-sans font-semibold text-xs text-slate-900 line-clamp-1">{doc.title}</h4>
                        <button
                          id={`btn-delete-doc-${doc.id}`}
                          onClick={() => onDeleteDoc(doc)}
                          className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-[10px] text-blue-600 mt-1 font-semibold">
                        <Calendar className="h-3 w-3" />
                        <span>Dated: {doc.date}</span>
                      </div>

                      <p className="text-[11px] text-slate-600 mt-2 line-clamp-3 leading-relaxed font-sans">
                        {doc.description || "No description provided."}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 mt-3 space-y-2">
                    {/* Linked ancestors */}
                    {linkedNames.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                        <Link className="h-3 w-3 text-blue-400 flex-shrink-0" />
                        <span className="truncate">Linked: {linkedNames.join(", ")}</span>
                      </div>
                    )}

                    {/* Tags list */}
                    {doc.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {doc.tags.map((t) => (
                          <span key={t} className="inline-flex items-center gap-1 bg-blue-50/50 text-blue-700 px-1.5 py-0.5 rounded-md text-[9px] font-semibold">
                            <Tag className="h-2 w-2" />
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
