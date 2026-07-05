import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  auth, 
  User,
  getSystemSettings,
  getUserSubscription,
  saveUserSubscription,
  getUserDonations
} from "../../services/auth";
import { 
  FamilyMember, 
  Gender, 
  PrivacySetting, 
  HistoricalDocument, 
  AnniversaryReminder,
  LineageAccessRequest
} from "../../types";
import { 
  syncDatabase, 
  addOrUpdateMember, 
  removeMember, 
  addOrUpdateDoc, 
  removeDoc, 
  addOrUpdateRem, 
  removeRem,
  isOnline,
  addOrUpdateAccessRequest,
  fetchIncomingAccessRequests
} from "../../services/syncService";
import { 
  getOfflineMembers, 
  getOfflineDocuments, 
  getOfflineReminders,
  clearAllOfflineStores
} from "../../utils/indexedDB";
import { encryptData, decryptData } from "../../utils/crypto";
import { motion, AnimatePresence } from "motion/react";
import { exportFamilyReportPDF, exportInvoicePDF } from "../../utils/pdfGenerator";

// Components
import FamilyTreeRenderer from "./FamilyTreeRenderer";
import DocumentManager from "./DocumentManager";
import AnniversaryReminders from "./AnniversaryReminders";
import AncestralMatcher from "./AncestralMatcher";
import SupportAndLegal from "../SupportAndLegal";
import ContactUs from "../ContactUs";
import SubscriptionModal from "../SubscriptionModal";
import SupportUs from "../SupportUs";
import FamilyInsights from "./FamilyInsights";

// Icons
import { 
  Network, 
  FileText, 
  Bell, 
  Search, 
  Download, 
  Lock, 
  Unlock, 
  LogOut, 
  User as UserIcon, 
  RefreshCw, 
  Plus, 
  X, 
  Trash2, 
  Sparkles,
  Shield,
  MapPin,
  Calendar,
  Phone,
  Mail,
  Edit,
  Printer,
  RotateCw,
  Upload,
  Heart,
  BarChart3,
  HelpCircle,
  KeyRound,
  Check
} from "lucide-react";

const CopyButton = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      copiedSelf();
    } catch (err) {
      console.error("Copy failed: ", err);
    }
  };

  const copiedSelf = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      disabled={!value}
      className={`p-1 rounded-md transition-all shrink-0 ${
        copied 
          ? "bg-emerald-50 text-emerald-600 border border-emerald-200" 
          : "hover:bg-slate-100 text-slate-400 hover:text-slate-600 border border-transparent"
      } cursor-pointer`}
      title={copied ? "Copied!" : "Copy info"}
    >
      {copied ? (
        <span className="text-[9px] font-sans font-bold text-emerald-600 px-1">Copied</span>
      ) : (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
};

const CustomFamilyTreeIcon = () => (
  <svg viewBox="0 0 64 64" className="h-16 w-16 text-slate-300 dark:text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M32 58V36" strokeWidth="3" className="stroke-slate-400" />
    <path d="M32 58c-6 0-10-2-12-4M32 58c6 0 10-2 12-4" className="stroke-slate-400" />
    <path d="M32 42c-8-2-12-8-12-14" />
    <path d="M32 46c8-2 12-8 12-14" />
    <path d="M32 36c0-6-4-10-4-14" />
    <path d="M32 36c0-6 4-10 4-14" />
    <circle cx="32" cy="14" r="5" fill="currentColor" className="text-blue-500/10 stroke-blue-500/40" />
    <circle cx="16" cy="24" r="5" fill="currentColor" className="text-emerald-500/10 stroke-emerald-500/40" />
    <circle cx="48" cy="24" r="5" fill="currentColor" className="text-rose-500/10 stroke-rose-500/40" />
    <path d="M28 14h8M12 24h8M44 24h8" strokeWidth="1" strokeDasharray="2 2" />
  </svg>
);

const getLifeSpanString = (birthdateStr?: string, deathdateStr?: string) => {
  if (!birthdateStr) return "";
  const birthYear = new Date(birthdateStr).getFullYear();
  if (isNaN(birthYear)) return "";
  if (deathdateStr) {
    const deathYear = new Date(deathdateStr).getFullYear();
    if (!isNaN(deathYear)) {
      return `${birthYear} - ${deathYear}`;
    }
  }
  return "";
};

const getDirectLineagePath = (targetId: string, allMembers: FamilyMember[]): FamilyMember[] => {
  if (!targetId || allMembers.length === 0) return [];
  
  const root = allMembers.find(
    m => m.relationshipToRoot.toLowerCase() === "self" || m.relationshipToRoot.toLowerCase() === "me"
  ) || allMembers[0];
  
  if (!root) return [];
  if (root.id === targetId) return [root];
  
  const queue: { current: string; path: FamilyMember[] }[] = [{ current: root.id, path: [root] }];
  const visited = new Set<string>([root.id]);
  
  while (queue.length > 0) {
    const { current, path } = queue.shift()!;
    if (current === targetId) {
      return path;
    }
    
    const currentMember = allMembers.find(m => m.id === current);
    if (currentMember) {
      const nextIds = [
        ...(currentMember.children || []),
        ...(currentMember.parents || []),
        ...(currentMember.siblings || [])
      ];
      
      for (const id of nextIds) {
        if (!visited.has(id)) {
          visited.add(id);
          const nextMember = allMembers.find(m => m.id === id);
          if (nextMember) {
            queue.push({ current: id, path: [...path, nextMember] });
          }
        }
      }
    }
  }
  
  const trace: FamilyMember[] = [];
  let curr: FamilyMember | undefined = allMembers.find(m => m.id === targetId);
  const seen = new Set<string>();
  while (curr && !seen.has(curr.id)) {
    seen.add(curr.id);
    trace.unshift(curr);
    if (curr.id === root.id) break;
    const parentId = curr.parents && curr.parents[0];
    if (parentId) {
      curr = allMembers.find(m => m.id === parentId);
    } else {
      break;
    }
  }
  
  if (trace.length > 0 && trace[0].id === root.id) {
    return trace;
  }
  
  const fallback = allMembers.find(m => m.id === targetId);
  return fallback ? [fallback] : [];
};

interface UserDashboardProps {
  user: User;
  onLogout: () => void;
  onEnterAdmin?: () => void;
}

export default function UserDashboard({ user, onLogout, onEnterAdmin }: UserDashboardProps) {
  // App core states
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [documents, setDocuments] = useState<HistoricalDocument[]>([]);
  const [reminders, setReminders] = useState<AnniversaryReminder[]>([]);

  // Undo/Redo Action History stack
  const [past, setPast] = useState<FamilyMember[][]>([]);
  const [future, setFuture] = useState<FamilyMember[][]>([]);

  const saveHistorySnapshot = (customMembers = members) => {
    const copy = JSON.parse(JSON.stringify(customMembers));
    setPast((prev) => [...prev, copy]);
    setFuture([]);
  };

  const applySnapshot = async (targetSnapshot: FamilyMember[]) => {
    try {
      const toDelete = members.filter(m => !targetSnapshot.some(ts => ts.id === m.id));
      for (const m of toDelete) {
        await removeMember(m);
      }

      for (const m of targetSnapshot) {
        const current = members.find(cm => cm.id === m.id);
        if (!current || JSON.stringify(current) !== JSON.stringify(m)) {
          await addOrUpdateMember(m);
        }
      }

      await loadLocalDatabase();
      await triggerSync(user.uid);
    } catch (error) {
      console.error("Error restoring history state snapshot:", error);
      triggerToast("Error restoring family tree snapshot");
    }
  };

  const handleUndo = async () => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    setFuture((prev) => [JSON.parse(JSON.stringify(members)), ...prev]);
    setPast(newPast);

    await applySnapshot(previous);
    triggerToast("Action undone");
  };

  const handleRedo = async () => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);

    setPast((prev) => [...prev, JSON.parse(JSON.stringify(members))]);
    setFuture(newFuture);

    await applySnapshot(next);
    triggerToast("Action redone");
  };

  const handleReparent = async (childId: string, parentId: string) => {
    if (childId === parentId) return;

    const child = members.find(m => m.id === childId);
    const parent = members.find(m => m.id === parentId);
    if (!child || !parent) return;

    const isDescendant = (ancestorId: string, potentialDescendantId: string): boolean => {
      const ancestor = members.find(m => m.id === ancestorId);
      if (!ancestor) return false;
      if (ancestor.children && ancestor.children.includes(potentialDescendantId)) return true;
      return ancestor.children ? ancestor.children.some(cId => isDescendant(cId, potentialDescendantId)) : false;
    };

    if (isDescendant(childId, parentId)) {
      triggerToast("Loop prevented: a descendant cannot be your parent!");
      return;
    }

    saveHistorySnapshot();

    try {
      const updates: FamilyMember[] = [];
      const gender = parent.gender;

      const oldParentId = child.parents.find(pid => {
        const pm = members.find(m => m.id === pid);
        return pm?.gender === gender;
      });

      let updatedParents = [...child.parents];
      if (oldParentId) {
        updatedParents = updatedParents.filter(id => id !== oldParentId);
        const oldParent = members.find(m => m.id === oldParentId);
        if (oldParent) {
          updates.push({
            ...oldParent,
            children: oldParent.children.filter(id => id !== childId)
          });
        }
      }

      if (!updatedParents.includes(parentId)) {
        updatedParents.push(parentId);
      }

      let updatedRelationship = child.relationshipToRoot;
      if (parent.relationshipToRoot.toLowerCase() === "self") {
        updatedRelationship = parent.gender === Gender.MALE ? "FATHER" : parent.gender === Gender.FEMALE ? "MOTHER" : "PARENT";
      }

      updates.push({
        ...child,
        parents: updatedParents,
        relationshipToRoot: updatedRelationship
      });

      if (!parent.children.includes(childId)) {
        updates.push({
          ...parent,
          children: [...parent.children, childId]
        });
      }

      for (const m of updates) {
        await addOrUpdateMember(m);
      }

      await loadLocalDatabase();
      await triggerSync(user.uid);
      triggerToast(`Successfully re-parented ${child.name} to ${parent.name}`);
    } catch (err) {
      console.error("Failed to re-parent family tree member:", err);
      triggerToast("Failed to re-parent family member");
    }
  };

  // Subscription / Payment states
  const [subscription, setSubscription] = useState<{
    isPremium: boolean;
    slots: number;
    amountPaid: number;
    paymentStatus: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    expiresAt?: number;
    history?: any[];
  } | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [userDonations, setUserDonations] = useState<any[]>([]);

  const loadUserDonationsData = async () => {
    try {
      const data = await getUserDonations();
      setUserDonations(data);
    } catch (e) {
      console.error("Failed to load user donations:", e);
    }
  };

  // Global admin settings
  const [systemSettings, setSystemSettings] = useState<{
    supportFlowEnabled: boolean;
    upgradeFlowEnabled: boolean;
    maxMembersIfUpgradeEnabled: number;
    freeTierLimit: number;
    premiumPriceMonthly: number;
    premiumPriceYearly: number;
    coupons: any[];
  }>({
    supportFlowEnabled: true,
    upgradeFlowEnabled: false,
    maxMembersIfUpgradeEnabled: 50,
    freeTierLimit: 3,
    premiumPriceMonthly: 99,
    premiumPriceYearly: 799,
    coupons: [],
  });

  const loadSystemSettings = async () => {
    try {
      const data = await getSystemSettings();
      if (data) {
        setSystemSettings({
          supportFlowEnabled: data.supportFlowEnabled !== false,
          upgradeFlowEnabled: data.upgradeFlowEnabled !== false,
          maxMembersIfUpgradeEnabled: data.maxMembersIfUpgradeEnabled ?? 50,
          freeTierLimit: data.freeTierLimit ?? 3,
          premiumPriceMonthly: data.premiumPriceMonthly ?? 99,
          premiumPriceYearly: data.premiumPriceYearly ?? 799,
          coupons: data.coupons || [],
        });
      }
    } catch (e) {
      console.warn("Could not retrieve system settings, using defaults", e);
    }
  };

  const loadUserSubscription = async (uid: string) => {
    try {
      const data = await getUserSubscription(uid);
      if (data) {
        setSubscription({
          isPremium: !!data.isPremium,
          slots: data.slots || 0,
          amountPaid: data.amountPaid || 0,
          paymentStatus: data.paymentStatus || "",
          razorpayOrderId: data.razorpayOrderId || "",
          razorpayPaymentId: data.razorpayPaymentId || "",
          expiresAt: data.expiresAt,
        });
      } else {
        setSubscription({
          isPremium: false,
          slots: 3,
          amountPaid: 0,
          paymentStatus: "",
        });
      }
    } catch (e) {
      console.error("Failed to load user subscription:", e);
    }
  };

  const handleUpdateSubscription = async (subData: {
    isPremium: boolean;
    slots: number;
    amountPaid: number;
    paymentStatus: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    expiresAt?: number;
  }) => {
    try {
      await saveUserSubscription(user.uid, subData);
      setSubscription(subData);
      setShowPaymentModal(false);
    } catch (e) {
      console.error("Failed to update user subscription in SQL backend:", e);
      alert("Billing record update failed. Please contact support.");
    }
  };

  const checkLimitBeforeAdd = () => {
    if (user.isAdmin) return true; // Admins bypass all tier limits
    let limit = systemSettings.freeTierLimit;
    if (subscription?.isPremium) {
      limit = systemSettings.upgradeFlowEnabled 
        ? systemSettings.maxMembersIfUpgradeEnabled 
        : (subscription.slots || 999999);
    } else {
      limit = systemSettings.freeTierLimit;
    }
    const activeMembersCount = members.filter(m => m.userId === user.uid && m.pendingSync !== "delete").length;
    if (activeMembersCount >= limit) {
      if (!subscription?.isPremium && !systemSettings.upgradeFlowEnabled) {
        alert(`Account limit reached (${limit} members). Premium subscription upgrades are currently disabled by the system administrator.`);
        return false;
      }
      setShowPaymentModal(true);
      return false;
    }
    return true;
  };
  
  // Selected state
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"tree" | "archive" | "reminders" | "matcher" | "support_legal" | "contact" | "support_us" | "invoices">("tree");
  const [treeSubView, setTreeSubView] = useState<"visual" | "insights">("visual");
  const [rotations, setRotations] = useState<Record<string, number>>({});
  const [reportOptions, setReportOptions] = useState({
    includeAnecdotes: true,
    includeContactInfo: true,
    includeFamilyTree: true,
  });

  const getMemberDeathDateStr = (memberId: string) => {
    const deathReminder = reminders.find(r => r.memberId === memberId && r.type === "death");
    if (deathReminder && deathReminder.date && deathReminder.date.length >= 10) {
      return deathReminder.date;
    }
    return undefined;
  };
  
  const [theme, setTheme] = useState<"modern" | "parchment">("modern");
  const [collapsedBranches, setCollapsedBranches] = useState<Set<string>>(new Set());

  const handleToggleCollapseBranch = (id: string) => {
    setCollapsedBranches((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  // Master Crypto Key State
  const [masterKey, setMasterKey] = useState(user.uid.substring(0, 16) + "AncestryVault");
  const [useCustomKey, setUseCustomKey] = useState(false);

  // Syncing & Offline Indicators
  const [isSyncing, setIsSyncing] = useState(false);
  const [networkOnline, setNetworkOnline] = useState(isOnline());
  const [syncLogs, setSyncLogs] = useState<string[]>([]);

  // Toast notification states
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  // Lineage Access Requests State & Actions
  const [incomingRequests, setIncomingRequests] = useState<LineageAccessRequest[]>([]);

  const loadRequests = async () => {
    try {
      const incoming = await fetchIncomingAccessRequests(user.uid);
      setIncomingRequests(incoming);
    } catch (err) {
      console.error("Failed to load access requests in dashboard:", err);
    }
  };

  const handleApproveMemberRequest = async (request: LineageAccessRequest, preset: "name-only" | "all" | "custom", customFields?: string[]) => {
    let fieldsToAllow: string[] = [];
    if (preset === "all") {
      fieldsToAllow = ["birthdate", "birthplace", "contactPhone", "contactEmail", "address", "notes"];
    } else if (preset === "name-only") {
      fieldsToAllow = [];
    } else if (preset === "custom" && customFields) {
      fieldsToAllow = customFields;
    }

    const updatedRequest: LineageAccessRequest = {
      ...request,
      status: "approved",
      allowedFields: fieldsToAllow
    };

    try {
      await addOrUpdateAccessRequest(updatedRequest);
      await loadRequests();
      triggerToast("Access request approved successfully");
    } catch (err: any) {
      console.error("Failed to approve access request:", err);
      triggerToast("Failed to approve access request");
    }
  };

  const handleDenyMemberRequest = async (request: LineageAccessRequest) => {
    const updatedRequest: LineageAccessRequest = {
      ...request,
      status: "rejected",
      allowedFields: []
    };

    try {
      await addOrUpdateAccessRequest(updatedRequest);
      await loadRequests();
      triggerToast("Access request denied");
    } catch (err: any) {
      console.error("Failed to deny access request:", err);
      triggerToast("Failed to deny access request");
    }
  };

  // Modals / Form toggles
  const [showAddForm, setShowAddForm] = useState(false);
  const [relativeSource, setRelativeSource] = useState<FamilyMember | null>(null);
  const [relativeType, setRelativeType] = useState<"father" | "mother" | "sibling" | "child" | null>(null);

  // Member form state
  const [formName, setFormName] = useState("");
  const [formBirthdate, setFormBirthdate] = useState("");
  const [formBirthplace, setFormBirthplace] = useState("");
  const [formGender, setFormGender] = useState<Gender>(Gender.MALE);
  const [formRelationship, setFormRelationship] = useState("Relative");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formPrivacy, setFormPrivacy] = useState<PrivacySetting>(PrivacySetting.PRIVATE);
  const [formIsAncestor, setFormIsAncestor] = useState(false);
  const [formNotes, setFormNotes] = useState("");

  // Advanced privacy form states
  const [formProfileVisibility, setFormProfileVisibility] = useState<"public" | "friends" | "specific" | "private">("private");
  const [formBranchVisibility, setFormBranchVisibility] = useState<"paternal" | "maternal" | "descendants" | "all" | "none">("all");
  const [formContactDetailsVisibility, setFormContactDetailsVisibility] = useState<"public" | "friends" | "specific" | "private">("private");
  const [formBirthdateVisibility, setFormBirthdateVisibility] = useState<"public" | "friends" | "specific" | "private">("private");
  const [formNotesVisibility, setFormNotesVisibility] = useState<"public" | "friends" | "specific" | "private">("private");
  const [formAllowedIndividuals, setFormAllowedIndividuals] = useState("");

  // Search Filter
  const [treeSearchQuery, setTreeSearchQuery] = useState("");

  // Quick-edit Notes State
  const [notesValue, setNotesValue] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  // Family Report Modal State
  const [showReportModal, setShowReportModal] = useState(false);

  // Custom Confirmation Modal State
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  // Initial Load & Auth effects
  useEffect(() => {
    loadLocalDatabase();
    loadUserSubscription(user.uid);
    loadSystemSettings();
    triggerSync(user.uid);
    loadRequests();
    loadUserDonationsData();
  }, [user.uid]);

  // Periodic polling for incoming requests
  useEffect(() => {
    loadRequests();
    const interval = setInterval(loadRequests, 8000);
    return () => clearInterval(interval);
  }, []);

  // Network offline/online listeners
  useEffect(() => {
    const handleOnline = () => {
      setNetworkOnline(true);
      triggerSync(user.uid);
    };
    const handleOffline = () => {
      setNetworkOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [user.uid]);

  const loadLocalDatabase = async () => {
    try {
      const offlineMembers = await getOfflineMembers();
      const offlineDocs = await getOfflineDocuments();
      const offlineRems = await getOfflineReminders();

      setMembers(offlineMembers);
      setDocuments(offlineDocs);
      setReminders(offlineRems);

      if (offlineMembers.length > 0 && !selectedMemberId) {
        const selfNode = offlineMembers.find(m => m.relationshipToRoot.toLowerCase() === "self" || m.relationshipToRoot.toLowerCase() === "me");
        setSelectedMemberId(selfNode?.id || offlineMembers[0].id);
      }
    } catch (e) {
      console.error("Failed to load offline database stores:", e);
    }
  };

  const triggerSync = async (userId: string) => {
    if (!isOnline() || isSyncing) return;
    setIsSyncing(true);
    setSyncLogs(prev => ["Triggering Sync with Ancestor Cloud...", ...prev]);

    try {
      const syncResult = await syncDatabase(userId);
      setSyncLogs(prev => [
        `Sync Completed! Pushed: ${syncResult.pushed} records. Pulled: ${syncResult.pulled} updates.`,
        ...prev
      ]);
      await loadLocalDatabase();
    } catch (error: any) {
      setSyncLogs(prev => [`Sync encountered error: ${error.message || error}`, ...prev]);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    saveHistorySnapshot();

    const newId = "member_" + Math.random().toString(36).substr(2, 9);
    let parentsList: string[] = [];
    let childrenList: string[] = [];
    let siblingsList: string[] = [];

    if (relativeSource && relativeType) {
      if (relativeType === "father" || relativeType === "mother") {
        parentsList = [];
      } else if (relativeType === "child") {
        parentsList = [relativeSource.id];
      } else if (relativeType === "sibling") {
        parentsList = [...relativeSource.parents];
      }
    }

    const newMember: FamilyMember = {
      id: newId,
      userId: user.uid,
      name: formName,
      birthdate: encryptData(formBirthdate, masterKey),
      birthplace: formBirthplace,
      gender: formGender,
      relationshipToRoot: relativeType ? `${relativeType.toUpperCase()}` : formRelationship,
      parents: parentsList,
      siblings: siblingsList,
      children: childrenList,
      contactPhone: encryptData(formPhone, masterKey),
      contactEmail: encryptData(formEmail, masterKey),
      address: encryptData(formAddress, masterKey),
      privacy: formPrivacy,
      isAncestor: formIsAncestor || relativeType === "father" || relativeType === "mother",
      photos: [],
      notes: formNotes,
      createdAt: Date.now(),
      access_controls: {
        contactInfo: true,
        birthdate: true,
        anecdotes: true,
      },
      advanced_privacy: {
        profileVisibility: formProfileVisibility,
        branchVisibility: formBranchVisibility,
        contactDetailsVisibility: formContactDetailsVisibility,
        birthdateVisibility: formBirthdateVisibility,
        notesVisibility: formNotesVisibility,
        allowedIndividuals: formAllowedIndividuals.split(",").map(s => s.trim()).filter(Boolean)
      }
    };

    try {
      await addOrUpdateMember(newMember);

      if (relativeSource && relativeType) {
        const sourceUpdate = { ...relativeSource };
        if (relativeType === "father" || relativeType === "mother") {
          sourceUpdate.parents = [...sourceUpdate.parents, newId];
        } else if (relativeType === "child") {
          sourceUpdate.children = [...sourceUpdate.children, newId];
        } else if (relativeType === "sibling") {
          sourceUpdate.siblings = [...sourceUpdate.siblings, newId];
        }
        await addOrUpdateMember(sourceUpdate);
      }

      await loadLocalDatabase();
      setSelectedMemberId(newId);
      resetForm();
      setShowAddForm(false);
      setRelativeSource(null);
      setRelativeType(null);
      triggerToast("Member added successfully");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMember = async (member: FamilyMember) => {
    setConfirmConfig({
      title: "Delete Member",
      message: `Are you sure you want to permanently delete ${member.name} and clear all linked nodes?`,
      onConfirm: async () => {
        try {
          saveHistorySnapshot();
          await removeMember(member);
          await loadLocalDatabase();
          setSelectedMemberId(null);
          triggerToast("Member deleted");
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const handleDeleteMultipleMembers = async (memberIds: string[]) => {
    try {
      saveHistorySnapshot();
      for (const id of memberIds) {
        const member = members.find((m) => m.id === id);
        if (member) {
          await removeMember(member);
        }
      }
      await loadLocalDatabase();
      setSelectedMemberId(null);
      triggerToast("Multiple members deleted");
    } catch (err) {
      console.error("Bulk delete failed:", err);
    }
  };

  const handleSaveNotes = async (memberId: string, updatedNotes: string) => {
    try {
      const member = members.find((m) => m.id === memberId);
      if (!member) return;
      saveHistorySnapshot();
      const updatedMember = {
        ...member,
        notes: updatedNotes,
      };
      await addOrUpdateMember(updatedMember);
      await loadLocalDatabase();
      triggerToast("Notes saved successfully");
    } catch (err) {
      console.error("Failed to save member notes:", err);
    }
  };

  const handleUpdateMemberPhotos = async (memberId: string, updatedPhotos: string[]) => {
    try {
      const member = members.find((m) => m.id === memberId);
      if (!member) return;
      saveHistorySnapshot();
      const updatedMember = {
        ...member,
        photos: updatedPhotos,
      };
      await addOrUpdateMember(updatedMember);
      await loadLocalDatabase();
      triggerToast("Photo uploaded successfully");
    } catch (err) {
      console.error("Failed to update member photos:", err);
    }
  };

  const handlePhotoUpload = async (memberId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        await handleUpdateMemberPhotos(memberId, [dataUrl]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddRelativeTrigger = (source: FamilyMember, type: "father" | "mother" | "sibling" | "child") => {
    if (!checkLimitBeforeAdd()) return;
    setRelativeSource(source);
    setRelativeType(type);
    setFormGender(type === "father" ? Gender.MALE : type === "mother" ? Gender.FEMALE : Gender.OTHER);
    setFormRelationship(type.charAt(0).toUpperCase() + type.slice(1));
    setFormIsAncestor(type === "father" || type === "mother");
    setShowAddForm(true);
  };

  const handleAddDocument = async (docData: HistoricalDocument) => {
    const documentRecord = { ...docData, userId: user.uid };
    await addOrUpdateDoc(documentRecord);
    await loadLocalDatabase();
    triggerToast("Document archived");
  };

  const handleDeleteDocument = async (docData: HistoricalDocument) => {
    await removeDoc(docData);
    await loadLocalDatabase();
    triggerToast("Document removed");
  };

  const handleAddReminder = async (remData: AnniversaryReminder) => {
    const reminderRecord = { ...remData, userId: user.uid };
    await addOrUpdateRem(reminderRecord);
    await loadLocalDatabase();
    triggerToast("Reminder added");
  };

  const handleDeleteReminder = async (remData: AnniversaryReminder) => {
    await removeRem(remData);
    await loadLocalDatabase();
    triggerToast("Reminder deleted");
  };

  const resetForm = () => {
    setFormName("");
    setFormBirthdate("");
    setFormBirthplace("");
    setFormGender(Gender.MALE);
    setFormRelationship("Relative");
    setFormPhone("");
    setFormEmail("");
    setFormAddress("");
    setFormPrivacy(PrivacySetting.PRIVATE);
    setFormIsAncestor(false);
    setFormNotes("");
    setFormProfileVisibility("private");
    setFormBranchVisibility("all");
    setFormContactDetailsVisibility("private");
    setFormBirthdateVisibility("private");
    setFormNotesVisibility("private");
    setFormAllowedIndividuals("");
  };

  const activeDecryptedMember = useMemo(() => {
    if (!selectedMemberId) return null;
    const member = members.find((m) => m.id === selectedMemberId);
    if (!member) return null;

    return {
      ...member,
      decryptedBirthdate: decryptData(member.birthdate, masterKey),
      decryptedPhone: decryptData(member.contactPhone, masterKey),
      decryptedEmail: decryptData(member.contactEmail, masterKey),
      decryptedAddress: decryptData(member.address, masterKey),
    };
  }, [selectedMemberId, members, masterKey]);

  const getCalculatedAge = (birthdateStr?: string, memberId?: string) => {
    if (!birthdateStr) return null;
    const birthDate = new Date(birthdateStr);
    if (isNaN(birthDate.getTime())) return null;

    let deathDateStr: string | undefined = undefined;
    if (memberId) {
      const deathReminder = reminders.find(r => r.memberId === memberId && r.type === "death");
      if (deathReminder && deathReminder.date) {
        if (deathReminder.date.length >= 10) {
          deathDateStr = deathReminder.date;
        }
      }
    }

    const endDate = deathDateStr ? new Date(deathDateStr) : new Date();
    if (isNaN(endDate.getTime())) return null;

    let age = endDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = endDate.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && endDate.getDate() < birthDate.getDate())) {
      age--;
    }
    
    if (age < 0) return null;
    return deathDateStr ? `${age} (at death)` : `${age}`;
  };

  const parentMembers = useMemo(() => {
    if (!activeDecryptedMember) return [];
    return members.filter(m => activeDecryptedMember.parents.includes(m.id));
  }, [activeDecryptedMember, members]);

  const childMembers = useMemo(() => {
    if (!activeDecryptedMember) return [];
    return members.filter(m => activeDecryptedMember.children.includes(m.id));
  }, [activeDecryptedMember, members]);

  useEffect(() => {
    if (activeDecryptedMember) {
      setNotesValue(activeDecryptedMember.notes || "");
    } else {
      setNotesValue("");
    }
    setIsEditingNotes(false);
  }, [selectedMemberId, activeDecryptedMember?.id]);

  const filteredTreeMembers = useMemo(() => {
    if (!treeSearchQuery.trim()) return [];
    const q = treeSearchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.relationshipToRoot && m.relationshipToRoot.toLowerCase().includes(q)) ||
        (m.birthplace && m.birthplace.toLowerCase().includes(q))
    );
  }, [members, treeSearchQuery]);

  return (
    <div className={`min-h-screen flex overflow-hidden w-full transition-colors duration-300 ${
      theme === "parchment"
        ? "theme-parchment bg-[#faf4e8] text-[#3e2723]"
        : "bg-slate-50 text-slate-900 font-sans"
    }`}>
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0 hidden lg:flex border-r border-slate-800">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2 text-white">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-mono">KN</div>
            Kinly
          </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <button
            id="tab-btn-tree"
            onClick={() => setActiveTab("tree")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "tree" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <Network className="h-4 w-4" />
            <span>Interactive Family Tree</span>
          </button>

          <button
            id="tab-btn-archive"
            onClick={() => setActiveTab("archive")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "archive" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Archives & Records</span>
          </button>

          <button
            id="tab-btn-reminders"
            onClick={() => setActiveTab("reminders")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "reminders" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <Bell className="h-4 w-4" />
            <span>Calendar Alarms</span>
          </button>

          <button
            id="tab-btn-matcher"
            onClick={() => setActiveTab("matcher")}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "matcher" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <Sparkles className="h-4 w-4" />
              <span>Network Scanner</span>
            </div>
            {incomingRequests.filter(r => r.status === "pending").length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                {incomingRequests.filter(r => r.status === "pending").length}
              </span>
            )}
          </button>

          <button
            id="tab-btn-support"
            onClick={() => setActiveTab("support_legal")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "support_legal" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <HelpCircle className="h-4 w-4" />
            <span>Help & Legal Center</span>
          </button>

          {systemSettings.supportFlowEnabled && (
            <button
              id="tab-btn-support-us"
              onClick={() => setActiveTab("support_us")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "support_us" ? "bg-rose-600 text-white shadow-sm" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <Heart className="h-4 w-4 text-rose-500 fill-rose-500 animate-pulse" />
              <span>Donate & Support</span>
            </button>
          )}

          <button
            id="tab-btn-invoices"
            onClick={() => setActiveTab("invoices")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "invoices" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Billing & Invoices</span>
          </button>

          <button
            id="tab-btn-contact"
            onClick={() => setActiveTab("contact")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "contact" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <Mail className="h-4 w-4" />
            <span>Contact Support</span>
          </button>

          {/* ADMIN CONSOLE TOGGLE BUTTON (Hidden if user is not admin) */}
          {user.isAdmin && onEnterAdmin && (
            <button
              id="tab-btn-admin"
              onClick={onEnterAdmin}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800/60 hover:text-white transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-amber-500 animate-pulse" />
                <span>Super Admin Console</span>
              </div>
              <span className="text-[9px] bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30 px-1.5 py-0.5 rounded-full">
                SWITCH
              </span>
            </button>
          )}

          {/* Security Config */}
          <div className="border-t border-slate-800/60 pt-4 mt-4 space-y-3">
            <h4 className="font-sans font-bold text-slate-400 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-blue-500" /> Security Settings
            </h4>
            
            <div className="space-y-2">
              <label className="flex items-start gap-2 py-1 cursor-pointer hover:bg-slate-800/40 rounded">
                <input
                  id="chk-custom-key"
                  type="checkbox"
                  checked={useCustomKey}
                  onChange={(e) => {
                    setUseCustomKey(e.target.checked);
                    if (!e.target.checked) {
                      setMasterKey(user.uid.substring(0, 16) + "AncestryVault");
                    } else {
                      setMasterKey("");
                    }
                  }}
                  className="rounded text-blue-600 h-3.5 w-3.5 mt-0.5 border-slate-700 bg-slate-950 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-300 font-sans font-medium leading-tight">Use Custom Security Password</span>
              </label>
            </div>

            {useCustomKey && (
              <div className="space-y-1 bg-slate-950/40 p-2 rounded-xl border border-slate-800/80">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                  Vault Decryption Key
                </label>
                <input
                  id="custom-master-key"
                  type="password"
                  value={masterKey}
                  onChange={(e) => setMasterKey(e.target.value)}
                  placeholder="Secret key word"
                  className="w-full text-[11px] px-2 py-1 rounded-lg border border-slate-800 focus:outline-blue-500 bg-slate-900 font-mono text-white"
                />
              </div>
            )}
          </div>

          {/* Theme Switcher */}
          <div className="border-t border-slate-800/60 pt-4 mt-4 space-y-3">
            <h4 className="font-sans font-bold text-slate-400 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
              <span>Aesthetic Theme</span>
            </h4>
            <button
              id="theme-toggle-btn"
              onClick={() => setTheme(prev => prev === "modern" ? "parchment" : "modern")}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-100 transition-all cursor-pointer border border-slate-700/50"
            >
              <span>🎨 {theme === "modern" ? "Classic Parchment" : "Modern Theme"}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900/60 text-slate-400 capitalize">
                {theme}
              </span>
            </button>
          </div>
        </nav>
        
        {/* Sidebar Bottom Sync/Crypto Panel */}
        <div className="p-4 bg-slate-950/40 border-t border-slate-800/80 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs uppercase">
              {user.email?.substring(0, 2) || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-200 truncate">{user.email?.split("@")[0] || "User"}</p>
              <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
            </div>
          </div>

          {user.isAdmin ? (
            <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-2.5 flex items-center gap-2 text-[10px] text-amber-400 font-bold uppercase tracking-wider">
              <Shield className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>🛡️ Admin (Unlimited)</span>
            </div>
          ) : subscription?.isPremium ? (
            <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-2 flex items-center justify-between text-[10px] text-emerald-400 font-semibold">
              <span>★ Premium ({subscription.slots >= 999999 ? "Unlimited" : `${subscription.slots} Slots`})</span>
              {systemSettings.upgradeFlowEnabled && (
                <button 
                  onClick={() => setShowPaymentModal(true)}
                  className="text-blue-400 hover:text-blue-300 underline font-bold cursor-pointer"
                >
                  Change
                </button>
              )}
            </div>
          ) : (
            <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-2.5 flex flex-col gap-1.5 text-[10px]">
              <div className="flex justify-between text-slate-300 font-medium">
                <span>Free Tier (3 slots max)</span>
                <span className="font-bold text-blue-400">Limited</span>
              </div>
              {systemSettings.upgradeFlowEnabled ? (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-[10px] font-bold cursor-pointer transition-colors text-center"
                >
                  Upgrade to Premium
                </button>
              ) : (
                <div className="w-full py-1 bg-slate-800 text-slate-500 rounded-md text-[9px] font-semibold text-center mt-1 border border-slate-750">
                  Upgrades Offline (Admin)
                </div>
              )}
            </div>
          )}
          
          <div className="space-y-1 text-[10px]">
            <div className="flex items-center justify-between text-slate-400 border-t border-slate-800/60 pt-2">
              <span>Database Status</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-emerald-400"></span> Encrypted
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Network Sync</span>
              <span className={networkOnline ? "text-emerald-400" : "text-amber-400"}>
                {networkOnline ? "● Cloud Ready" : "● Offline Local"}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN APPLICATION AREA */}
      <div className="flex-grow flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Top Header bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <div className="lg:hidden h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md">
              <Network className="h-4.5 w-4.5" />
            </div>
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">
              {activeTab === "tree" && "Interactive Family Tree"}
              {activeTab === "archive" && "Historical Records Archive"}
              {activeTab === "reminders" && "Timeline & Alarms"}
              {activeTab === "matcher" && "DNA Network Scanner"}
            </h2>
            <div className="hidden sm:block h-4 w-px bg-slate-200"></div>
            <div className="hidden sm:block text-xs text-slate-500 font-medium">
              {isSyncing ? "Synchronizing database..." : "Database secure & encrypted"}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="btn-sync-now"
              onClick={() => triggerSync(user.uid)}
              disabled={isSyncing || !networkOnline}
              className="p-1.5 rounded-lg border border-slate-200 hover:border-blue-600 bg-white text-slate-600 hover:text-blue-600 transition-colors disabled:opacity-50 cursor-pointer"
              title="Sync now"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={() => { if (checkLimitBeforeAdd()) setShowAddForm(true); }}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add Member</span>
            </button>

            <div className="h-4 w-px bg-slate-200"></div>

            <button
              id="btn-signout"
              onClick={onLogout}
              className="px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-xs font-semibold text-slate-500 hover:text-rose-600 transition-all cursor-pointer flex items-center gap-1"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Responsive Mobile Tab Rail */}
        <div className="lg:hidden shrink-0 bg-slate-900 text-white px-4 py-2 border-b border-slate-800">
          <nav className="flex gap-1 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab("tree")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all shrink-0 ${
                activeTab === "tree" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800"
              }`}
            >
              <Network className="h-3.5 w-3.5" />
              <span>Tree</span>
            </button>
            <button
              onClick={() => setActiveTab("archive")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all shrink-0 ${
                activeTab === "archive" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Archives</span>
            </button>
            <button
              onClick={() => setActiveTab("reminders")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all shrink-0 ${
                activeTab === "reminders" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800"
              }`}
            >
              <Bell className="h-3.5 w-3.5" />
              <span>Alarms</span>
            </button>
            <button
              onClick={() => setActiveTab("matcher")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all shrink-0 ${
                activeTab === "matcher" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Scanner</span>
              {incomingRequests.filter(r => r.status === "pending").length > 0 && (
                <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse ml-1">
                  {incomingRequests.filter(r => r.status === "pending").length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("support_legal")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all shrink-0 ${
                activeTab === "support_legal" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800"
              }`}
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Help</span>
            </button>
            <button
              onClick={() => setActiveTab("invoices")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all shrink-0 ${
                activeTab === "invoices" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Invoices</span>
            </button>

            <button
              onClick={() => setActiveTab("contact")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all shrink-0 ${
                activeTab === "contact" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800"
              }`}
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Contact</span>
            </button>
            {user.isAdmin && onEnterAdmin && (
              <button
                onClick={onEnterAdmin}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all shrink-0 text-slate-400 hover:bg-slate-800"
              >
                <Shield className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                <span>Admin</span>
              </button>
            )}
          </nav>
        </div>

        {/* Content Box */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {activeTab === "tree" && (
              <div className="space-y-6">
                <div className="flex border-b border-slate-200 pb-px">
                  <button
                    onClick={() => setTreeSubView("visual")}
                    className={`px-5 py-2.5 border-b-2 text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-1.5 ${
                      treeSubView === "visual" ? "border-blue-600 text-blue-600 font-bold" : "border-transparent text-slate-500 hover:text-slate-800 font-medium"
                    }`}
                  >
                    <Network className="h-4 w-4" />
                    <span>Family Tree View</span>
                  </button>
                  <button
                    onClick={() => setTreeSubView("insights")}
                    className={`px-5 py-2.5 border-b-2 text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-1.5 ${
                      treeSubView === "insights" ? "border-blue-600 text-blue-600 font-bold" : "border-transparent text-slate-500 hover:text-slate-800 font-medium"
                    }`}
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span>Family Insights Panel</span>
                  </button>
                </div>

                {treeSubView === "visual" ? (
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="xl:col-span-2 space-y-6">
                      <div className="relative">
                        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                          <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <input
                            id="search-tree-members"
                            type="text"
                            value={treeSearchQuery}
                            onChange={(e) => setTreeSearchQuery(e.target.value)}
                            placeholder="Quick search family names, birthplaces, or lineages..."
                            className="w-full text-xs focus:outline-none font-sans bg-transparent"
                          />
                          {treeSearchQuery && (
                            <button id="btn-clear-search" onClick={() => setTreeSearchQuery("")} className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer">×</button>
                          )}
                        </div>

                        {filteredTreeMembers.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200/80 rounded-2xl shadow-xl max-h-60 overflow-y-auto z-50 p-2 space-y-1">
                            <div className="text-[10px] font-bold text-slate-400 px-2 py-1.5 uppercase tracking-wider border-b border-slate-100/60 mb-1 flex items-center justify-between">
                              <span>Matching Family Records ({filteredTreeMembers.length})</span>
                              <span className="text-[9px] font-mono text-slate-300">Click to focus</span>
                            </div>
                            {filteredTreeMembers.map((m) => (
                              <button
                                key={m.id}
                                onClick={() => setSelectedMemberId(m.id)}
                                className="w-full text-left p-2 hover:bg-blue-50/45 rounded-xl transition-all duration-150 flex items-center justify-between group cursor-pointer"
                              >
                                <div className="min-w-0 pr-2">
                                  <span className="text-xs font-semibold text-slate-800 block truncate group-hover:text-blue-600 transition-colors">
                                    {m.name}
                                  </span>
                                  <span className="text-[10px] text-slate-400 truncate block">
                                    {m.relationshipToRoot || "Relative"} {m.birthplace ? `• ${m.birthplace}` : ""}
                                  </span>
                                </div>
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-medium shrink-0 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                                  Select
                                  </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <FamilyTreeRenderer
                        members={members}
                        searchQuery={treeSearchQuery}
                        selectedMemberId={selectedMemberId}
                        onSelectMember={setSelectedMemberId}
                        onAddRelative={handleAddRelativeTrigger}
                        masterKey={masterKey}
                        onDeleteMembers={handleDeleteMultipleMembers}
                        collapsedBranches={Array.from(collapsedBranches)}
                        onToggleCollapseBranch={handleToggleCollapseBranch}
                        pastLength={past.length}
                        futureLength={future.length}
                        onUndo={handleUndo}
                        onRedo={handleRedo}
                        onReparent={handleReparent}
                      />
                    </div>

                    <div className="xl:col-span-1">
                      <AnimatePresence mode="wait">
                        {activeDecryptedMember ? (
                          <motion.div
                            key={activeDecryptedMember.id}
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -20, opacity: 0 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 sticky top-4"
                          >
                            <div className="relative p-3 bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl border border-slate-300 shadow-md">
                              <div className="absolute top-1.5 left-1.5 w-3.5 h-3.5 border-t-2 border-l-2 border-slate-400 rounded-tl-xs pointer-events-none" />
                              <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 border-t-2 border-r-2 border-slate-400 rounded-tr-xs pointer-events-none" />
                              <div className="absolute bottom-1.5 left-1.5 w-3.5 h-3.5 border-b-2 border-l-2 border-slate-400 rounded-bl-xs pointer-events-none" />
                              <div className="absolute bottom-1.5 right-1.5 w-3.5 h-3.5 border-b-2 border-r-2 border-slate-400 rounded-br-xs pointer-events-none" />

                              <div className="relative overflow-hidden rounded-2xl border-4 border-double border-slate-400/40 bg-slate-50">
                                <div className="relative w-full h-48">
                                  {activeDecryptedMember.photos && activeDecryptedMember.photos.length > 0 ? (
                                    <div className="w-full h-full overflow-hidden flex items-center justify-center bg-slate-100">
                                      <img
                                        src={activeDecryptedMember.photos[0]}
                                        alt={activeDecryptedMember.name}
                                        style={{ transform: `rotate(${rotations[activeDecryptedMember.id] || 0}deg)` }}
                                        className="w-full h-full object-cover transition-transform duration-300"
                                        referrerPolicy="no-referrer"
                                      />
                                    </div>
                                  ) : (
                                    <div className={`w-full h-full flex flex-col items-center justify-center ${
                                      activeDecryptedMember.gender === Gender.MALE ? "bg-blue-50/20" : activeDecryptedMember.gender === Gender.FEMALE ? "bg-rose-50/20" : "bg-slate-100/50"
                                    }`}>
                                      <CustomFamilyTreeIcon />
                                      <span className="text-[11px] text-slate-400 mt-2 font-medium">No photo available</span>
                                    </div>
                                  )}
                                  
                                  <input
                                    type="file"
                                    id={`portrait-file-input-${activeDecryptedMember.id}`}
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handlePhotoUpload(activeDecryptedMember.id, e)}
                                  />

                                  <button
                                    id="btn-trigger-upload"
                                    type="button"
                                    onClick={() => document.getElementById(`portrait-file-input-${activeDecryptedMember.id}`)?.click()}
                                    className="absolute bottom-2 right-2 p-2 rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm hover:scale-105 transition-all cursor-pointer z-10"
                                    title="Upload member photo"
                                  >
                                    <Upload className="h-4 w-4 text-blue-600" />
                                  </button>

                                  {activeDecryptedMember.photos && activeDecryptedMember.photos.length > 0 && (
                                    <button
                                      id="btn-rotate-photo"
                                      type="button"
                                      onClick={() => {
                                        const cur = rotations[activeDecryptedMember.id] || 0;
                                        setRotations({ ...rotations, [activeDecryptedMember.id]: (cur + 90) % 360 });
                                      }}
                                      className="absolute bottom-2 left-2 p-2 rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm hover:scale-105 transition-all cursor-pointer z-10 flex items-center justify-center"
                                      title="Rotate photo 90°"
                                    >
                                      <RotateCw className="h-4 w-4 text-blue-600" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="space-y-3">
                              {(() => {
                                const lineagePath = getDirectLineagePath(activeDecryptedMember.id, members);
                                if (lineagePath.length > 0) {
                                  return (
                                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 font-medium pb-2 border-b border-slate-100 font-sans">
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mr-1">Direct Lineage:</span>
                                      {lineagePath.map((node, idx) => (
                                        <React.Fragment key={node.id}>
                                          {idx > 0 && <span className="text-slate-300">/</span>}
                                          <button
                                            onClick={() => setSelectedMemberId(node.id)}
                                            className={`hover:text-blue-600 hover:underline cursor-pointer transition-colors ${
                                              node.id === activeDecryptedMember.id ? "text-blue-600 font-bold" : "text-slate-600"
                                            }`}
                                          >
                                            {node.name}
                                          </button>
                                        </React.Fragment>
                                      ))}
                                    </div>
                                  );
                                }
                                return null;
                              })()}

                              <div className="flex items-start justify-between">
                                <div>
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-blue-100">
                                    {activeDecryptedMember.relationshipToRoot}
                                  </span>
                                  <h3 className="font-sans font-bold text-lg text-slate-900 mt-2">{activeDecryptedMember.name}</h3>
                                </div>
                                
                                <button
                                  id={`btn-delete-member-${activeDecryptedMember.id}`}
                                  onClick={() => handleDeleteMember(activeDecryptedMember)}
                                  className="p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                                  title="Delete this node"
                                >
                                  <Trash2 className="h-4.5 w-4.5" />
                                </button>
                              </div>

                              <div className="space-y-2 bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                    <Edit className="h-3 w-3 text-blue-500" /> Anecdotes & Notes
                                  </span>
                                  {!isEditingNotes ? (
                                    <button
                                      id="btn-edit-notes"
                                      onClick={() => setIsEditingNotes(true)}
                                      className="text-blue-600 hover:text-blue-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                                    >
                                      <Edit className="h-3 w-3" /> Quick Edit
                                    </button>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <button
                                        id="btn-cancel-notes"
                                        onClick={() => {
                                          setNotesValue(activeDecryptedMember.notes || "");
                                          setIsEditingNotes(false);
                                        }}
                                        className="text-slate-500 hover:text-slate-600 text-[11px] font-medium cursor-pointer transition-colors"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        id="btn-save-notes"
                                        onClick={async () => {
                                          await handleSaveNotes(activeDecryptedMember.id, notesValue);
                                          setIsEditingNotes(false);
                                        }}
                                        className="text-blue-600 hover:text-blue-700 text-[11px] font-bold cursor-pointer transition-colors"
                                      >
                                        Save
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {!isEditingNotes ? (
                                  <p className="text-xs text-slate-600 leading-relaxed font-sans italic whitespace-pre-line">
                                    {activeDecryptedMember.notes || "No general anecdotes added for this member."}
                                  </p>
                                ) : (
                                  <textarea
                                    id="textarea-edit-notes"
                                    rows={3}
                                    value={notesValue}
                                    onChange={(e) => setNotesValue(e.target.value)}
                                    placeholder="Add temporary notes or anecdotes..."
                                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-blue-500 font-sans resize-none bg-white focus:ring-1 focus:ring-blue-500"
                                  />
                                )}

                                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                                  <div className="flex flex-col min-w-0 pr-2">
                                    <span className="text-[11px] font-semibold text-slate-800">Branch Controls</span>
                                    <span className="text-[9px] text-slate-400 font-medium">Collapse or expand direct children in tree</span>
                                  </div>
                                  <button
                                    id="btn-toggle-branch"
                                    onClick={() => handleToggleCollapseBranch(activeDecryptedMember.id)}
                                    className={`px-2.5 py-1 rounded-xl text-[10px] font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                                      collapsedBranches.has(activeDecryptedMember.id)
                                        ? "bg-amber-600 hover:bg-amber-700 text-white"
                                        : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                                    }`}
                                  >
                                    {collapsedBranches.has(activeDecryptedMember.id) ? "Expand Branches" : "Collapse Branches"}
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="border-t border-slate-100 pt-5 space-y-4">
                              <h4 className="font-sans font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                                <Lock className="h-3.5 w-3.5 text-blue-600" />
                                <span>Decrypted Contact Info</span>
                              </h4>

                              <div className="space-y-2.5">
                                <div className="flex items-center justify-between text-xs text-slate-700 bg-slate-50/60 p-2.5 rounded-xl border border-slate-100 hover:bg-slate-100/50 transition-colors">
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                                    <Calendar className="h-4 w-4 text-blue-500 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center justify-between gap-2">
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Birthdate</p>
                                        {activeDecryptedMember.decryptedBirthdate && (() => {
                                          const deathDateStr = getMemberDeathDateStr(activeDecryptedMember.id);
                                          const ageValue = getCalculatedAge(activeDecryptedMember.decryptedBirthdate, activeDecryptedMember.id);
                                          if (deathDateStr) {
                                            const spanStr = getLifeSpanString(activeDecryptedMember.decryptedBirthdate, deathDateStr);
                                            return (
                                              <span className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-full font-bold border border-slate-200">
                                                Life Span: {spanStr} {ageValue ? `(at death: ${ageValue.replace(" (at death)", "")})` : ""}
                                              </span>
                                            );
                                          } else {
                                            return (
                                              <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full font-bold border border-blue-200">
                                                Age {ageValue}
                                              </span>
                                            );
                                          }
                                        })()}
                                      </div>
                                      <p className="font-mono mt-0.5 font-medium truncate">{activeDecryptedMember.decryptedBirthdate || "Unknown"}</p>
                                    </div>
                                  </div>
                                  {activeDecryptedMember.decryptedBirthdate && (
                                    <CopyButton value={activeDecryptedMember.decryptedBirthdate} />
                                  )}
                                </div>

                                <div className="flex items-center justify-between text-xs text-slate-700 bg-slate-50/60 p-2.5 rounded-xl border border-slate-100 hover:bg-slate-100/50 transition-colors">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <MapPin className="h-4 w-4 text-blue-500 shrink-0" />
                                    <div className="min-w-0">
                                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Birthplace</p>
                                      <p className="mt-0.5 font-medium truncate">{activeDecryptedMember.birthplace || "Unknown"}</p>
                                    </div>
                                  </div>
                                  {activeDecryptedMember.birthplace && (
                                    <CopyButton value={activeDecryptedMember.birthplace} />
                                  )}
                                </div>

                                <div className="flex items-center justify-between text-xs text-slate-700 bg-slate-50/60 p-2.5 rounded-xl border border-slate-100 hover:bg-slate-100/50 transition-colors">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <Mail className="h-4 w-4 text-blue-500 shrink-0" />
                                    <div className="min-w-0">
                                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Email Address</p>
                                      <p className="mt-0.5 font-medium truncate">{activeDecryptedMember.decryptedEmail || "Not registered"}</p>
                                    </div>
                                  </div>
                                  {activeDecryptedMember.decryptedEmail && (
                                    <CopyButton value={activeDecryptedMember.decryptedEmail} />
                                  )}
                                </div>

                                <div className="flex items-center justify-between text-xs text-slate-700 bg-slate-50/60 p-2.5 rounded-xl border border-slate-100 hover:bg-slate-100/50 transition-colors">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <Phone className="h-4 w-4 text-blue-500 shrink-0" />
                                    <div className="min-w-0">
                                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Phone Line</p>
                                      <p className="mt-0.5 font-medium truncate">{activeDecryptedMember.decryptedPhone || "Not registered"}</p>
                                    </div>
                                  </div>
                                  {activeDecryptedMember.decryptedPhone && (
                                    <CopyButton value={activeDecryptedMember.decryptedPhone} />
                                  )}
                                </div>

                                <div className="flex items-center justify-between text-xs text-slate-700 bg-slate-50/60 p-2.5 rounded-xl border border-slate-100 hover:bg-slate-100/50 transition-colors">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <MapPin className="h-4 w-4 text-blue-500 shrink-0" />
                                    <div className="min-w-0">
                                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Historical Address</p>
                                      <p className="mt-0.5 font-medium truncate">{activeDecryptedMember.decryptedAddress || "Not registered"}</p>
                                    </div>
                                  </div>
                                  {activeDecryptedMember.decryptedAddress && (
                                    <CopyButton value={activeDecryptedMember.decryptedAddress} />
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="border-t border-slate-100 pt-5 space-y-3">
                              <h4 className="font-sans font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                                <Network className="h-3.5 w-3.5 text-blue-600" />
                                <span>Direct Lineage Navigation</span>
                              </h4>
                              <div className="grid grid-cols-2 gap-3.5 bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100">
                                <div>
                                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Parents</span>
                                  {parentMembers.length > 0 ? (
                                    <div className="flex flex-col gap-1">
                                      {parentMembers.map((parent) => (
                                        <button
                                          key={parent.id}
                                          type="button"
                                          onClick={() => setSelectedMemberId(parent.id)}
                                          className="text-left text-xs text-blue-600 hover:text-blue-800 hover:underline truncate font-medium cursor-pointer"
                                        >
                                          • {parent.name}
                                        </button>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">None linked</span>
                                  )}
                                </div>
                                <div>
                                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Children</span>
                                  {childMembers.length > 0 ? (
                                    <div className="flex flex-col gap-1">
                                      {childMembers.map((child) => (
                                        <button
                                          key={child.id}
                                          type="button"
                                          onClick={() => setSelectedMemberId(child.id)}
                                          className="text-left text-xs text-blue-600 hover:text-blue-800 hover:underline truncate font-medium cursor-pointer"
                                        >
                                          • {child.name}
                                        </button>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">None linked</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="border-t border-slate-100 pt-5 space-y-3.5">
                              <h4 className="font-sans font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                                <Plus className="h-4 w-4 text-blue-600" />
                                <span>Expand Branches</span>
                              </h4>

                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  id="btn-add-father"
                                  onClick={() => handleAddRelativeTrigger(activeDecryptedMember, "father")}
                                  className="p-2 text-center rounded-xl border border-slate-200 hover:border-blue-600 hover:bg-blue-50/20 text-[11px] font-semibold text-slate-700 transition-all cursor-pointer"
                                >
                                  + Add Father
                                </button>
                                <button
                                  id="btn-add-mother"
                                  onClick={() => handleAddRelativeTrigger(activeDecryptedMember, "mother")}
                                  className="p-2 text-center rounded-xl border border-slate-200 hover:border-blue-600 hover:bg-blue-50/20 text-[11px] font-semibold text-slate-700 transition-all cursor-pointer"
                                >
                                  + Add Mother
                                </button>
                                <button
                                  id="btn-add-sibling"
                                  onClick={() => handleAddRelativeTrigger(activeDecryptedMember, "sibling")}
                                  className="p-2 text-center rounded-xl border border-slate-200 hover:border-blue-600 hover:bg-blue-50/20 text-[11px] font-semibold text-slate-700 transition-all cursor-pointer"
                                >
                                  + Add Sibling
                                </button>
                                <button
                                  id="btn-add-child"
                                  onClick={() => handleAddRelativeTrigger(activeDecryptedMember, "child")}
                                  className="p-2 text-center rounded-xl border border-slate-200 hover:border-blue-600 hover:bg-blue-50/20 text-[11px] font-semibold text-slate-700 transition-all cursor-pointer"
                                >
                                  + Add Child
                                </button>
                              </div>
                            </div>

                            <div className="border-t border-slate-100 pt-5">
                              <button
                                id="btn-gen-family-report"
                                type="button"
                                onClick={() => setShowReportModal(true)}
                                className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
                              >
                                <Printer className="h-4 w-4" />
                                <span>Generate Family Report</span>
                              </button>
                            </div>

                            <div className="border-t border-slate-100 pt-5 space-y-3">
                              <h4 className="font-sans font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                                <Shield className="h-4 w-4 text-indigo-600" />
                                <span>Advanced Privacy Controls</span>
                              </h4>
                              <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
                                Customize individual profile visibility, branch access permissions, and granular data type settings.
                              </p>
                              
                              {(() => {
                                const adv = activeDecryptedMember.advanced_privacy || {
                                  profileVisibility: activeDecryptedMember.privacy === PrivacySetting.PUBLIC ? "public" : activeDecryptedMember.privacy === PrivacySetting.FAMILY ? "friends" : "private",
                                  branchVisibility: "all",
                                  contactDetailsVisibility: "private",
                                  birthdateVisibility: "private",
                                  notesVisibility: "private",
                                  allowedIndividuals: []
                                };

                                const handleUpdateAdvPrivacy = async (key: keyof typeof adv, value: any) => {
                                  const updatedAdv = {
                                    ...adv,
                                    [key]: value
                                  };
                                  const updatedMember = {
                                    ...activeDecryptedMember,
                                    advanced_privacy: updatedAdv
                                  };
                                  await addOrUpdateMember(updatedMember);
                                  await loadLocalDatabase();
                                  triggerToast("Advanced privacy updated successfully");
                                };

                                return (
                                  <div className="space-y-3.5 bg-slate-50 p-4 border border-slate-200/60 rounded-2xl">
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold text-slate-500 uppercase flex justify-between">
                                        <span>Profile Visibility</span>
                                        <span className="text-indigo-600 font-semibold">{adv.profileVisibility}</span>
                                      </label>
                                      <select
                                        id="sidebar-profile-visibility"
                                        value={adv.profileVisibility}
                                        onChange={(e) => handleUpdateAdvPrivacy("profileVisibility", e.target.value)}
                                        className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-gray-200 focus:outline-indigo-600 bg-white font-sans font-medium"
                                      >
                                        <option value="public">Public (Everyone)</option>
                                        <option value="friends">Friends-Only (Decrypted Network)</option>
                                        <option value="specific">Specific Individuals Only</option>
                                        <option value="private">Private (Owner Only)</option>
                                      </select>
                                    </div>

                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold text-slate-500 uppercase flex justify-between">
                                        <span>Branch Permission</span>
                                        <span className="text-indigo-600 font-semibold">{adv.branchVisibility}</span>
                                      </label>
                                      <select
                                        id="sidebar-branch-visibility"
                                        value={adv.branchVisibility}
                                        onChange={(e) => handleUpdateAdvPrivacy("branchVisibility", e.target.value)}
                                        className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-gray-200 focus:outline-indigo-600 bg-white font-sans font-medium"
                                      >
                                        <option value="all">Entire Tree (All Branches)</option>
                                        <option value="paternal">Paternal Lineage Only</option>
                                        <option value="maternal">Maternal Lineage Only</option>
                                        <option value="descendants">Direct Descendants Only</option>
                                        <option value="none">No Branches (Stand-Alone Profile)</option>
                                      </select>
                                    </div>

                                    <div className="border-t border-slate-200/60 pt-3 space-y-2.5">
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Granular Data Fields:</span>
                                      
                                      <div className="grid grid-cols-2 gap-2.5">
                                        <div className="space-y-1">
                                          <label className="text-[10px] text-slate-600 font-medium">Birthdate</label>
                                          <select
                                            id="sidebar-birthdate-visibility"
                                            value={adv.birthdateVisibility}
                                            onChange={(e) => handleUpdateAdvPrivacy("birthdateVisibility", e.target.value)}
                                            className="w-full text-[11px] px-2 py-1 rounded-lg border border-gray-200 bg-white font-sans"
                                          >
                                            <option value="public">Public</option>
                                            <option value="friends">Friends</option>
                                            <option value="specific">Specific</option>
                                            <option value="private">Private</option>
                                          </select>
                                        </div>

                                        <div className="space-y-1">
                                          <label className="text-[10px] text-slate-600 font-medium">Contact Details</label>
                                          <select
                                            id="sidebar-contact-visibility"
                                            value={adv.contactDetailsVisibility}
                                            onChange={(e) => handleUpdateAdvPrivacy("contactDetailsVisibility", e.target.value)}
                                            className="w-full text-[11px] px-2 py-1 rounded-lg border border-gray-200 bg-white font-sans"
                                          >
                                            <option value="public">Public</option>
                                            <option value="friends">Friends</option>
                                            <option value="specific">Specific</option>
                                            <option value="private">Private</option>
                                          </select>
                                        </div>
                                      </div>

                                      <div className="space-y-1">
                                        <label className="text-[10px] text-slate-600 font-medium">Notes & Anecdotes</label>
                                        <select
                                          id="sidebar-notes-visibility"
                                          value={adv.notesVisibility}
                                          onChange={(e) => handleUpdateAdvPrivacy("notesVisibility", e.target.value)}
                                          className="w-full text-[11px] px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white font-sans"
                                        >
                                          <option value="public">Public</option>
                                          <option value="friends">Friends-Only</option>
                                          <option value="specific">Specific Individuals</option>
                                          <option value="private">Private</option>
                                        </select>
                                      </div>
                                    </div>

                                    {(adv.profileVisibility === "specific" || 
                                      adv.contactDetailsVisibility === "specific" || 
                                      adv.birthdateVisibility === "specific" || 
                                      adv.notesVisibility === "specific") && (
                                      <div className="space-y-1 pt-2.5 border-t border-slate-200/60">
                                        <label className="text-[10px] font-bold text-indigo-700 uppercase block">
                                          Whitelisted Emails:
                                        </label>
                                        <input
                                          id="sidebar-allowed-individuals"
                                          type="text"
                                          defaultValue={adv.allowedIndividuals.join(", ")}
                                          onBlur={(e) => {
                                            const list = e.target.value.split(",").map(x => x.trim()).filter(Boolean);
                                            handleUpdateAdvPrivacy("allowedIndividuals", list);
                                          }}
                                          placeholder="cousin@gmail.com, uncle@mail.com"
                                          className="w-full text-xs px-3 py-1.5 rounded-xl border border-indigo-200 focus:outline-indigo-600 bg-white font-sans shadow-xs"
                                        />
                                        <span className="text-[9px] text-slate-400 block font-medium leading-tight">
                                          Press tab or click outside to save changes.
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>

                            <div className="border-t border-slate-100 pt-5 space-y-3">
                              <h4 className="font-sans font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                                <KeyRound className="h-4 w-4 text-rose-500" />
                                <span>Incoming Access Requests</span>
                              </h4>
                              
                              {(() => {
                                const pendingRequests = incomingRequests.filter(
                                  (r) => r.memberId === activeDecryptedMember.id && r.status === "pending"
                                );
                                
                                if (pendingRequests.length === 0) {
                                  return (
                                    <p className="text-[11px] text-slate-400 italic">
                                      No pending vault requests for this member.
                                    </p>
                                  );
                                }

                                return (
                                  <div className="space-y-3">
                                    {pendingRequests.map((req) => (
                                      <div key={req.id} className="bg-rose-50/50 border border-rose-100/60 rounded-xl p-3.5 space-y-3 text-xs">
                                        <div className="font-sans font-medium text-slate-700">
                                          Request from <strong className="text-slate-950">{req.fromUserEmail}</strong>
                                        </div>
                                        
                                        <div className="space-y-2">
                                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                            Select Sharing Preset:
                                          </div>
                                          <div className="grid grid-cols-2 gap-2">
                                            <button
                                              type="button"
                                              onClick={() => handleApproveMemberRequest(req, "name-only")}
                                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer text-center"
                                            >
                                              View name only
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleApproveMemberRequest(req, "all")}
                                              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer text-center"
                                            >
                                              View all
                                            </button>
                                          </div>

                                          <div className="pt-1 text-[10px] text-slate-500">
                                            Or approve with individual overrides above.
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2 pt-1">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const controls = activeDecryptedMember.access_controls || { birthdate: true, contactInfo: true, anecdotes: true };
                                              const fields: string[] = [];
                                              if (controls.birthdate !== false) {
                                                fields.push("birthdate", "birthplace");
                                              }
                                              if (controls.contactInfo !== false) {
                                                fields.push("contactPhone", "contactEmail", "address");
                                              }
                                              if (controls.anecdotes !== false) {
                                                fields.push("notes");
                                              }
                                              handleApproveMemberRequest(req, "custom", fields);
                                            }}
                                            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                                          >
                                            <Check className="h-3 w-3" /> Approve Custom
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDenyMemberRequest(req)}
                                            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                                          >
                                            <X className="h-3 w-3" /> Deny
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>

                            <div className="border-t border-slate-100 pt-5 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                              <span>Node Privacy Setting:</span>
                              <span className="font-bold text-blue-700 uppercase">
                                {activeDecryptedMember.privacy}
                              </span>
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="no-member"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-500 text-xs"
                          >
                            Select a node in the tree to decrypt and view complete genealogical logs.
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                ) : (
                  <FamilyInsights
                    members={members}
                    reminders={reminders}
                    masterKey={masterKey}
                    onSelectMember={setSelectedMemberId}
                    setActiveTab={setActiveTab}
                    setTreeSubView={setTreeSubView}
                  />
                )}
              </div>
            )}

            {activeTab === "archive" && (
              <DocumentManager
                documents={documents}
                members={members}
                onAddDoc={handleAddDocument}
                onDeleteDoc={handleDeleteDocument}
              />
            )}

            {activeTab === "reminders" && (
              <AnniversaryReminders
                reminders={reminders}
                members={members}
                onAddReminder={handleAddReminder}
                onDeleteReminder={handleDeleteReminder}
                masterKey={masterKey}
              />
            )}

            {activeTab === "matcher" && (
              <AncestralMatcher
                userMembers={members}
                currentUserId={user.uid}
                userEmail={user.email || undefined}
                masterKey={masterKey}
                onRefreshDatabase={loadLocalDatabase}
              />
            )}

            {activeTab === "support_legal" && (
              <SupportAndLegal />
            )}

            {activeTab === "contact" && (
              <ContactUs />
            )}

            {activeTab === "support_us" && (
              systemSettings.supportFlowEnabled ? (
                <SupportUs userEmail={user.email || ""} userId={user.uid} />
              ) : (
                <div className="p-8 text-center bg-white border border-slate-200 rounded-3xl max-w-md mx-auto space-y-4">
                  <Heart className="h-12 w-12 text-slate-300 mx-auto" />
                  <h3 className="font-bold text-slate-900 text-base">Support Flow Suspended</h3>
                  <p className="text-xs text-slate-500">The donation and support gateway is temporarily offline or disabled by the platform administrator.</p>
                </div>
              )
            )}

            {activeTab === "invoices" && (
              <BillingHistoryTab 
                user={user} 
                subscription={subscription} 
                donations={userDonations}
              />
            )}

          </div>
        </div>
      </div>

      {/* ADD FAMILY MEMBER DRAWER/MODAL FORM */}
      {showAddForm && (
        <div className="fixed inset-0 bg-indigo-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-gray-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-indigo-900 px-6 py-4 flex items-center justify-between text-white">
              <div>
                <h3 className="font-sans font-semibold text-base">
                  {relativeType 
                    ? `Add ${relativeType.charAt(0).toUpperCase() + relativeType.slice(1)} to ${relativeSource?.name}` 
                    : "Add Family Member"}
                </h3>
                <p className="text-[10px] text-indigo-200 mt-0.5">
                  Secure symmetric browser-side encryption will be applied on submit.
                </p>
              </div>
              <button
                id="btn-close-modal"
                onClick={() => {
                  setShowAddForm(false);
                  setRelativeSource(null);
                  setRelativeType(null);
                }}
                className="p-1 rounded-lg hover:bg-white/10 text-indigo-200 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form id="add-member-modal-form" onSubmit={handleAddMemberSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Full Name *</label>
                  <input
                    id="form-name"
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g., John Fletcher"
                    className="w-full text-xs px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-indigo-600 font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Relationship *</label>
                  <input
                    id="form-relationship"
                    type="text"
                    required
                    disabled={!!relativeType}
                    value={formRelationship}
                    onChange={(e) => setFormRelationship(e.target.value)}
                    placeholder="e.g., Self, Father, Sister"
                    className="w-full text-xs px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-indigo-600 font-sans disabled:bg-gray-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Birthdate *</label>
                  <input
                    id="form-birthdate"
                    type="date"
                    required
                    value={formBirthdate}
                    onChange={(e) => setFormBirthdate(e.target.value)}
                    className="w-full text-xs px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-indigo-600 font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Birthplace</label>
                  <input
                    id="form-birthplace"
                    type="text"
                    value={formBirthplace}
                    onChange={(e) => setFormBirthplace(e.target.value)}
                    placeholder="e.g., Boston, MA"
                    className="w-full text-xs px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-indigo-600 font-sans"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Gender</label>
                  <select
                    id="form-gender"
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as Gender)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 focus:outline-indigo-600 font-sans bg-white"
                  >
                    <option value={Gender.MALE}>Male</option>
                    <option value={Gender.FEMALE}>Female</option>
                    <option value={Gender.OTHER}>Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Privacy Status</label>
                  <select
                    id="form-privacy"
                    value={formPrivacy}
                    onChange={(e) => {
                      const val = e.target.value as PrivacySetting;
                      setFormPrivacy(val);
                      if (val === PrivacySetting.PUBLIC) {
                        setFormProfileVisibility("public");
                      } else if (val === PrivacySetting.PRIVATE) {
                        setFormProfileVisibility("private");
                      } else {
                        setFormProfileVisibility("friends");
                      }
                    }}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 focus:outline-indigo-600 font-sans bg-white"
                  >
                    <option value={PrivacySetting.PRIVATE}>Private (Owner Only)</option>
                    <option value={PrivacySetting.FAMILY}>Family (Decrypted Tree Only)</option>
                    <option value={PrivacySetting.PUBLIC}>Public (Allows Matching)</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-3.5">
                <div className="flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
                  <Shield className="h-4 w-4 text-indigo-600" />
                  <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                    Advanced Privacy Granularity
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Profile Visibility</label>
                    <select
                      id="form-adv-profile-visibility"
                      value={formProfileVisibility}
                      onChange={(e) => setFormProfileVisibility(e.target.value as any)}
                      className="w-full text-[11px] px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-indigo-600 bg-white font-sans font-medium"
                    >
                      <option value="public">Public</option>
                      <option value="friends">Friends-Only</option>
                      <option value="specific">Specific Individuals</option>
                      <option value="private">Private</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Branch Permissions</label>
                    <select
                      id="form-adv-branch-visibility"
                      value={formBranchVisibility}
                      onChange={(e) => setFormBranchVisibility(e.target.value as any)}
                      className="w-full text-[11px] px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-indigo-600 bg-white font-sans font-medium"
                    >
                      <option value="all">Entire Tree (All Branches)</option>
                      <option value="paternal">Paternal Lineage Only</option>
                      <option value="maternal">Maternal Lineage Only</option>
                      <option value="descendants">Direct Descendants Only</option>
                      <option value="none">No Branches (Stand-Alone Profile)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Birthdate Access</label>
                    <select
                      id="form-adv-birthdate-visibility"
                      value={formBirthdateVisibility}
                      onChange={(e) => setFormBirthdateVisibility(e.target.value as any)}
                      className="w-full text-[11px] px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white font-sans"
                    >
                      <option value="public">Public</option>
                      <option value="friends">Friends-Only</option>
                      <option value="specific">Specific</option>
                      <option value="private">Private</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Contact Details</label>
                    <select
                      id="form-adv-contact-visibility"
                      value={formContactDetailsVisibility}
                      onChange={(e) => setFormContactDetailsVisibility(e.target.value as any)}
                      className="w-full text-[11px] px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white font-sans"
                    >
                      <option value="public">Public</option>
                      <option value="friends">Friends-Only</option>
                      <option value="specific">Specific</option>
                      <option value="private">Private</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Anecdotes / Notes</label>
                    <select
                      id="form-adv-notes-visibility"
                      value={formNotesVisibility}
                      onChange={(e) => setFormNotesVisibility(e.target.value as any)}
                      className="w-full text-[11px] px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white font-sans"
                    >
                      <option value="public">Public</option>
                      <option value="friends">Friends-Only</option>
                      <option value="specific">Specific</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                </div>

                {(formProfileVisibility === "specific" || 
                  formContactDetailsVisibility === "specific" || 
                  formBirthdateVisibility === "specific" || 
                  formNotesVisibility === "specific") && (
                  <div className="space-y-1 pt-1.5 border-t border-slate-200/50 animate-fade-in">
                    <label className="text-[10px] font-bold text-indigo-700 uppercase block">
                      Authorized Email Whitelist *
                    </label>
                    <input
                      id="form-adv-allowed-individuals"
                      type="text"
                      value={formAllowedIndividuals}
                      onChange={(e) => setFormAllowedIndividuals(e.target.value)}
                      placeholder="e.g., cousin@gmail.com, uncle@mail.com"
                      className="w-full text-[11px] px-3 py-2 rounded-xl border border-indigo-200 focus:outline-indigo-600 bg-white font-sans shadow-xs"
                    />
                    <span className="text-[9px] text-slate-400 block font-medium leading-tight">
                      Only users with these emails will be permitted to unlock these decrypted fields.
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-3 space-y-4">
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                  🔒 Zero-Knowledge Contact Details (Fully Encrypted client-side)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700">Contact Email</label>
                    <input
                      id="form-email"
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="e.g., email@family.com"
                      className="w-full text-xs px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-indigo-600 font-sans"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700">Contact Phone</label>
                    <input
                      id="form-phone"
                      type="text"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="e.g., +1 555-0199"
                      className="w-full text-xs px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-indigo-600 font-sans"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Historical / Current Address</label>
                  <input
                    id="form-address"
                    type="text"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="e.g., 42 Beacon St, Boston"
                    className="w-full text-xs px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-indigo-600 font-sans"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">Historical Anecdotes & Notes</label>
                <textarea
                  id="form-notes"
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g., Worked as a silversmith, loved historical literature..."
                  className="w-full text-xs px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-indigo-600 font-sans resize-none"
                />
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  id="form-is-ancestor"
                  type="checkbox"
                  checked={formIsAncestor}
                  onChange={(e) => setFormIsAncestor(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="text-xs text-gray-700 font-medium font-sans">
                  Mark as Historical Ancestor (Hides from direct descendant listing unless matches found)
                </span>
              </div>

              <div className="flex gap-3 border-t border-gray-100 pt-4 mt-2">
                <button
                  id="btn-cancel-modal"
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setRelativeSource(null);
                    setRelativeType(null);
                  }}
                  className="w-1/2 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-member"
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
                >
                  Symmetric Save Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GENEALOGICAL FAMILY REPORT MODAL */}
      {showReportModal && activeDecryptedMember && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200 shadow-2xl p-8 space-y-6 relative max-h-[90vh] overflow-y-auto print:fixed print:inset-0 print:bg-white print:p-8 print:w-full print:h-full print:max-h-none print:z-[100] print:shadow-none print:border-none">
            <div className="border-b border-slate-100 pb-4 print:hidden space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <h3 className="font-sans font-bold text-base text-slate-900">Genealogical Family Report</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    id="btn-export-pdf"
                    onClick={() => {
                      if (!activeDecryptedMember) return;
                      const calculatedAge = activeDecryptedMember.decryptedBirthdate 
                        ? `${getCalculatedAge(activeDecryptedMember.decryptedBirthdate, activeDecryptedMember.id)}${getCalculatedAge(activeDecryptedMember.decryptedBirthdate, activeDecryptedMember.id)?.includes("at death") ? "" : " years old"}` 
                        : "Unknown";
                      exportFamilyReportPDF(
                        activeDecryptedMember,
                        parentMembers,
                        childMembers,
                        reportOptions,
                        calculatedAge
                      );
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export PDF</span>
                  </button>
                  <button
                    id="btn-print-report"
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Print Report</span>
                  </button>
                  <button
                    id="btn-close-report"
                    onClick={() => setShowReportModal(false)}
                    className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/60 p-3.5 rounded-2xl flex flex-wrap gap-4 items-center justify-start text-xs font-medium text-slate-700">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2">Include Sections:</span>
                
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={reportOptions.includeContactInfo}
                    onChange={(e) => setReportOptions({ ...reportOptions, includeContactInfo: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                  />
                  <span>Contact Info & Details</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={reportOptions.includeFamilyTree}
                    onChange={(e) => setReportOptions({ ...reportOptions, includeFamilyTree: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                  />
                  <span>Family Connections</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={reportOptions.includeAnecdotes}
                    onChange={(e) => setReportOptions({ ...reportOptions, includeAnecdotes: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                  />
                  <span>Anecdotes & Notes</span>
                </label>
              </div>
            </div>

            <div className="space-y-6 font-sans text-left">
              <div className="border-b-2 border-slate-800 pb-5 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">Genealogical Family Report</h1>
                  <p className="text-xs text-slate-500 font-mono mt-1">Symmetric-Key Decrypted Copy • Generated on {new Date().toLocaleDateString()}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lineage Role</span>
                  <span className="text-xs font-bold text-blue-700 uppercase">{activeDecryptedMember.relationshipToRoot || "Relative"}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                <div className="md:col-span-1 flex flex-col items-center">
                  <div className="w-full aspect-square max-w-[180px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-xs">
                    {activeDecryptedMember.photos && activeDecryptedMember.photos.length > 0 ? (
                      <img
                        src={activeDecryptedMember.photos[0]}
                        alt={activeDecryptedMember.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50">
                        <UserIcon className="h-12 w-12 text-slate-300" />
                        <span className="text-[10px] text-slate-400 mt-1 font-medium">No photo</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 space-y-4">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Full Legal Name</span>
                    <h2 className="text-xl font-bold text-slate-900 mt-0.5">{activeDecryptedMember.name}</h2>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Gender</span>
                      <span className="text-xs text-slate-700 font-semibold capitalize mt-1 block">{activeDecryptedMember.gender}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Calculated Age</span>
                      <span className="text-xs text-slate-700 font-semibold mt-1 block">
                        {activeDecryptedMember.decryptedBirthdate 
                          ? `${getCalculatedAge(activeDecryptedMember.decryptedBirthdate, activeDecryptedMember.id)}${getCalculatedAge(activeDecryptedMember.decryptedBirthdate, activeDecryptedMember.id)?.includes("at death") ? "" : " years old"}` 
                          : "Unknown"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {reportOptions.includeContactInfo && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 border-b border-slate-200 pb-1.5">Personal & Historical Details</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Birthdate</span>
                      <span className="font-mono text-slate-800 font-medium">{activeDecryptedMember.decryptedBirthdate || "Not Recorded"}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Birthplace</span>
                      <span className="text-slate-800 font-medium">{activeDecryptedMember.birthplace || "Not Recorded"}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Secure Email</span>
                      <span className="text-slate-800 font-medium">{activeDecryptedMember.decryptedEmail || "None registered"}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Secure Phone Line</span>
                      <span className="text-slate-800 font-medium">{activeDecryptedMember.decryptedPhone || "None registered"}</span>
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Historical Address</span>
                      <span className="text-slate-800 font-medium">{activeDecryptedMember.decryptedAddress || "None registered"}</span>
                    </div>
                  </div>
                </div>
              )}

              {reportOptions.includeFamilyTree && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 border-b border-slate-200 pb-1.5">Family Tree Network & Connections</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Parents</span>
                      {parentMembers.length > 0 ? (
                        <ul className="space-y-1 font-medium text-slate-800">
                          {parentMembers.map(m => <li key={m.id}>• {m.name}</li>)}
                        </ul>
                      ) : (
                        <span className="text-slate-400 italic">No connections logged</span>
                      )}
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Children</span>
                      {childMembers.length > 0 ? (
                        <ul className="space-y-1 font-medium text-slate-800">
                          {childMembers.map(m => <li key={m.id}>• {m.name}</li>)}
                        </ul>
                      ) : (
                        <span className="text-slate-400 italic">No connections logged</span>
                      )}
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Privacy Status</span>
                      <span className="text-slate-700 font-semibold uppercase">{activeDecryptedMember.privacy}</span>
                    </div>
                  </div>
                </div>
              )}

              {reportOptions.includeAnecdotes && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 border-b border-slate-200 pb-1.5">Historical Anecdotes & Notes</h3>
                  <p className="text-xs text-slate-600 leading-relaxed italic whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {activeDecryptedMember.notes || "No historical anecdotes or personal journal entries have been recorded for this ancestor/member."}
                  </p>
                </div>
              )}

              <div className="border-t border-slate-200 pt-5 text-center">
                <p className="text-[10px] text-slate-400 font-medium">
                  This record is secured using end-to-end symmetric client-side encryption. Only authorized key-holders can decrypt this copy.
                </p>
                <p className="text-[9px] text-slate-300 font-mono mt-1">Record ID: {activeDecryptedMember.id}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmConfig && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4"
          >
            <h3 className="font-sans font-bold text-base text-slate-900">{confirmConfig.title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{confirmConfig.message}</p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmConfig(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await confirmConfig.onConfirm();
                  setConfirmConfig(null);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 bg-slate-900/95 text-white px-4.5 py-3 rounded-2xl border border-emerald-500/30 shadow-2xl backdrop-blur-md"
          >
            <div className="h-6 w-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Check className="h-3.5 w-3.5" />
            </div>
            <span className="font-sans font-semibold text-xs tracking-tight text-slate-100">
              {toastMessage}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SUBSCRIPTION & PAYMENTS OVERLAY */}
      <AnimatePresence>
        {showPaymentModal && (
          <SubscriptionModal
            currentMembersCount={members.filter(m => m.userId === user.uid && m.pendingSync !== "delete").length}
            userEmail={user.email || ""}
            onClose={() => setShowPaymentModal(false)}
            onSubscriptionUpdate={handleUpdateSubscription}
            upgradeFlowEnabled={systemSettings.upgradeFlowEnabled}
            maxUpgradeSlots={systemSettings.maxMembersIfUpgradeEnabled}
            freeTierLimit={systemSettings.freeTierLimit}
            premiumPriceMonthly={systemSettings.premiumPriceMonthly}
            premiumPriceYearly={systemSettings.premiumPriceYearly}
            coupons={systemSettings.coupons}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────── Billing History Component ─────────────────────────── */

interface BillingHistoryTabProps {
  user: User;
  subscription: any;
  donations: any[];
}

function BillingHistoryTab({ user, subscription, donations }: BillingHistoryTabProps) {
  // Combine subscription history and donations into a single chronological ledger
  const invoiceHistory = useMemo(() => {
    const list: any[] = [];

    // Add subscription invoices from subscription.history array
    if (subscription && Array.isArray(subscription.history)) {
      subscription.history.forEach((h: any) => {
        list.push({
          id: h.invoiceId,
          type: "Subscription",
          description: `Premium Subscription Upgrade (${h.slots} slots)`,
          amount: h.amount,
          date: h.date,
          razorpayOrderId: h.razorpayOrderId,
          razorpayPaymentId: h.razorpayPaymentId,
          status: h.status,
          raw: h
        });
      });
    }

    // Add donations
    if (Array.isArray(donations)) {
      donations.forEach((d: any) => {
        list.push({
          id: `INV-DON-${d.createdAt}-${d.id.substring(0, 4).toUpperCase()}`,
          type: "Donation",
          description: "Operations Support Contribution",
          amount: d.amount,
          date: d.createdAt,
          razorpayOrderId: d.razorpayOrderId || "N/A",
          razorpayPaymentId: d.razorpayPaymentId || "N/A",
          status: d.status,
          raw: d
        });
      });
    }

    // Sort by date descending
    return list.sort((a, b) => b.date - a.date);
  }, [subscription, donations]);

  const handleDownloadPDF = (inv: any) => {
    try {
      exportInvoicePDF({
        invoiceId: inv.id,
        type: inv.type === "Subscription" ? "Subscription" : "Donation",
        amount: inv.amount,
        date: inv.date,
        razorpayOrderId: inv.razorpayOrderId,
        razorpayPaymentId: inv.razorpayPaymentId,
        userEmail: user.email || "",
        displayName: user.displayName || undefined,
        slots: inv.type === "Subscription" ? inv.raw.slots : undefined
      });
    } catch (err: any) {
      alert("Failed to generate PDF: " + err.message);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-2">
          <span>Billing History & Invoices</span>
        </h1>
        <p className="text-xs text-slate-500 font-mono mt-1">
          Review subscription invoices and general donations logs. Download official PDF receipts.
        </p>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl relative overflow-hidden shadow-xs">
          <span className="text-slate-400 font-mono text-[9px] uppercase font-bold tracking-wider">Account Tier</span>
          <h3 className="text-lg font-bold text-slate-900 mt-1">
            {user.isAdmin ? "🛡️ Administrator" : subscription?.isPremium ? "★ Premium Account" : "Free Tier Account"}
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">
            {user.isAdmin ? "Unlimited slots" : subscription?.isPremium ? `${subscription.slots} family members max` : "3 family members limit"}
          </p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl relative overflow-hidden shadow-xs">
          <span className="text-slate-400 font-mono text-[9px] uppercase font-bold tracking-wider">Total Contributed</span>
          <h3 className="text-lg font-bold text-slate-900 mt-1">
            INR {(
              invoiceHistory.reduce((sum, h) => sum + h.amount, 0)
            ).toLocaleString()}
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">Over {invoiceHistory.length} transactions</p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl relative overflow-hidden shadow-xs">
          <span className="text-slate-400 font-mono text-[9px] uppercase font-bold tracking-wider">Active Invoices</span>
          <h3 className="text-lg font-bold text-slate-900 mt-1">
            {invoiceHistory.length} PDFs Ready
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">Symmetric-validated ledger</p>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Ledger Receipts</h3>
          <span className="text-[10px] text-slate-400 font-mono">{invoiceHistory.length} Transactions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 divide-y divide-slate-200">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Invoice ID</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Status</th>
                {user.isAdmin && <th className="px-6 py-3">Admin Diagnostics</th>}
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {invoiceHistory.length === 0 ? (
                <tr>
                  <td colSpan={user.isAdmin ? 8 : 7} className="text-center py-12 text-slate-400 text-xs font-medium">
                    No billing history or invoice logs found for this account.
                  </td>
                </tr>
              ) : (
                invoiceHistory.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3 font-mono text-[11px] font-semibold text-slate-800">{inv.id}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        inv.type === "Subscription" ? "bg-indigo-50 text-indigo-700 border border-indigo-100/50" : "bg-rose-50 text-rose-700 border border-rose-100/50"
                      }`}>
                        {inv.type}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-600">{inv.description}</td>
                    <td className="px-6 py-3 font-bold text-slate-800">₹{inv.amount.toLocaleString()}</td>
                    <td className="px-6 py-3 text-slate-500 font-mono text-[10px]">{new Date(inv.date).toLocaleDateString()}</td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-100">
                        Paid
                      </span>
                    </td>
                    {user.isAdmin && (
                      <td className="px-6 py-3 font-mono text-[10px] text-slate-500 bg-slate-50/50">
                        <div className="font-semibold text-slate-700">Txn: {inv.razorpayPaymentId || "N/A"}</div>
                        <div>Source: Razorpay API</div>
                        <div>App: Family Tree</div>
                      </td>
                    )}
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => handleDownloadPDF(inv)}
                        className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-all shadow-xs"
                      >
                        Download PDF
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
