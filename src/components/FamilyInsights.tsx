import React, { useState, useMemo } from "react";
import { FamilyMember, Gender, AnniversaryReminder } from "../types";
import { decryptData } from "../utils/crypto";
import { 
  BarChart3, 
  Globe, 
  Award, 
  Users, 
  Hourglass, 
  MapPin, 
  Search, 
  User, 
  Eye, 
  ArrowRight, 
  TrendingUp,
  X,
  Calendar,
  Layers,
  Heart
} from "lucide-react";

interface FamilyInsightsProps {
  members: FamilyMember[];
  reminders: AnniversaryReminder[];
  masterKey: string;
  onSelectMember: (id: string) => void;
  setActiveTab: (tab: "tree" | "archive" | "reminders" | "matcher" | "support_legal" | "contact" | "super_admin" | "support_us") => void;
  setTreeSubView: (view: "visual" | "insights") => void;
}

// Age brackets configuration
const AGE_BRACKETS = [
  { id: "infancy", label: "Infants", range: "0-2", min: 0, max: 2, color: "from-blue-400 to-cyan-400" },
  { id: "childhood", label: "Children", range: "3-12", min: 3, max: 12, color: "from-cyan-400 to-teal-400" },
  { id: "teens", label: "Teens & Youth", range: "13-19", min: 13, max: 19, color: "from-teal-400 to-emerald-400" },
  { id: "young_adult", label: "Young Adults", range: "20-35", min: 20, max: 35, color: "from-indigo-400 to-blue-500" },
  { id: "adult", label: "Adults", range: "36-50", min: 36, max: 50, color: "from-blue-500 to-indigo-600" },
  { id: "middle_age", label: "Middle-Aged", range: "51-70", min: 51, max: 70, color: "from-indigo-600 to-violet-600" },
  { id: "seniors", label: "Seniors", range: "71-90", min: 71, max: 90, color: "from-violet-600 to-purple-600" },
  { id: "elders", label: "Elders & Centenarians", range: "91+", min: 91, max: 200, color: "from-purple-600 to-rose-600" },
];

export default function FamilyInsights({
  members,
  reminders,
  masterKey,
  onSelectMember,
  setActiveTab,
  setTreeSubView
}: FamilyInsightsProps) {
  // Filters state
  const [selectedBirthplaceFilter, setSelectedBirthplaceFilter] = useState<string | null>(null);
  const [selectedAgeBracketFilter, setSelectedAgeBracketFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Decrypted Members calculations
  const decryptedMembers = useMemo(() => {
    return members.map((m) => {
      const birthdateDecrypted = decryptData(m.birthdate, masterKey);
      
      // Calculate Age
      let age: number | null = null;
      let isDeceased = false;
      let deathDateStr: string | undefined = undefined;

      // Check if there is a death reminder
      const deathReminder = reminders.find(r => r.memberId === m.id && r.type === "death");
      if (deathReminder && deathReminder.date) {
        isDeceased = true;
        if (deathReminder.date.length >= 10) {
          deathDateStr = deathReminder.date;
        }
      }

      if (birthdateDecrypted && !birthdateDecrypted.startsWith("🔒") && !birthdateDecrypted.startsWith("❌")) {
        const birthDate = new Date(birthdateDecrypted);
        if (!isNaN(birthDate.getTime())) {
          const endDate = deathDateStr ? new Date(deathDateStr) : new Date();
          if (!isNaN(endDate.getTime())) {
            let calculatedAge = endDate.getFullYear() - birthDate.getFullYear();
            const monthDiff = endDate.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && endDate.getDate() < birthDate.getDate())) {
              calculatedAge--;
            }
            if (calculatedAge >= 0) {
              age = calculatedAge;
            }
          }
        }
      }

      return {
        ...m,
        decryptedBirthdate: birthdateDecrypted,
        age,
        isDeceased,
        deathDateStr
      };
    });
  }, [members, reminders, masterKey]);

  // Longest path of generations (longest chain of descendants)
  const totalGenerations = useMemo(() => {
    if (members.length === 0) return 0;
    
    const memberMap = new Map<string, FamilyMember>();
    members.forEach(m => memberMap.set(m.id, m));
    
    const depthMemo = new Map<string, number>();
    
    const getDepth = (id: string, visited: Set<string>): number => {
      if (depthMemo.has(id)) return depthMemo.get(id)!;
      if (visited.has(id)) return 0;
      
      visited.add(id);
      const member = memberMap.get(id);
      if (!member || member.parents.length === 0) {
        depthMemo.set(id, 1);
        visited.delete(id);
        return 1;
      }
      
      let maxParentDepth = 0;
      member.parents.forEach(pId => {
        maxParentDepth = Math.max(maxParentDepth, getDepth(pId, visited));
      });
      
      const depth = maxParentDepth + 1;
      depthMemo.set(id, depth);
      visited.delete(id);
      return depth;
    };
    
    let maxTreeDepth = 0;
    members.forEach(m => {
      maxTreeDepth = Math.max(maxTreeDepth, getDepth(m.id, new Set<string>()));
    });
    
    return maxTreeDepth;
  }, [members]);

  // Overall statistics
  const stats = useMemo(() => {
    const total = decryptedMembers.length;
    if (total === 0) {
      return {
        total: 0,
        avgAge: 0,
        livingCount: 0,
        livingAvgAge: 0,
        oldestMember: null,
        mostCommonBirthplace: "N/A",
        mostCommonBirthplaceCount: 0,
        maleRatio: 0,
        femaleRatio: 0,
        otherRatio: 0,
      };
    }

    let ageSum = 0;
    let ageCount = 0;
    let livingAgeSum = 0;
    let livingAgeCount = 0;
    let livingCount = 0;
    let oldestMember: typeof decryptedMembers[0] | null = null;

    // Birthplaces aggregation
    const birthplaceCounts: Record<string, number> = {};
    let maleCount = 0;
    let femaleCount = 0;
    let otherCount = 0;

    decryptedMembers.forEach((m) => {
      // Age aggregates
      if (m.age !== null) {
        ageSum += m.age;
        ageCount++;

        if (!m.isDeceased) {
          livingAgeSum += m.age;
          livingAgeCount++;
        }

        if (!oldestMember || (m.age > (oldestMember.age || 0))) {
          oldestMember = m;
        }
      }

      if (!m.isDeceased) {
        livingCount++;
      }

      // Gender count
      if (m.gender === Gender.MALE) maleCount++;
      else if (m.gender === Gender.FEMALE) femaleCount++;
      else otherCount++;

      // Birthplace aggregation
      const place = m.birthplace?.trim() || "Not Recorded";
      birthplaceCounts[place] = (birthplaceCounts[place] || 0) + 1;
    });

    // Find most common birthplace
    let mostCommonBirthplace = "Not Recorded";
    let mostCommonBirthplaceCount = 0;
    Object.entries(birthplaceCounts).forEach(([place, count]) => {
      if (place !== "Not Recorded" && count > mostCommonBirthplaceCount) {
        mostCommonBirthplace = place;
        mostCommonBirthplaceCount = count;
      }
    });

    // If no specific birthplaces recorded, default to first recorded, or "Not Recorded"
    if (mostCommonBirthplaceCount === 0 && birthplaceCounts["Not Recorded"]) {
      mostCommonBirthplaceCount = birthplaceCounts["Not Recorded"];
    }

    return {
      total,
      avgAge: ageCount > 0 ? Math.round(ageSum / ageCount) : 0,
      livingCount,
      livingAvgAge: livingAgeCount > 0 ? Math.round(livingAgeSum / livingAgeCount) : 0,
      oldestMember,
      mostCommonBirthplace,
      mostCommonBirthplaceCount,
      maleRatio: Math.round((maleCount / total) * 100),
      femaleRatio: Math.round((femaleCount / total) * 100),
      otherRatio: Math.round((otherCount / total) * 100),
    };
  }, [decryptedMembers]);

  // Birthplaces chart distribution data
  const birthplaceDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    decryptedMembers.forEach((m) => {
      const place = m.birthplace?.trim() || "Not Recorded";
      counts[place] = (counts[place] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([place, count]) => ({
        place,
        count,
        percentage: Math.round((count / decryptedMembers.length) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [decryptedMembers]);

  // Age brackets distribution data
  const ageBracketDistribution = useMemo(() => {
    const distribution = AGE_BRACKETS.map((bracket) => {
      const count = decryptedMembers.filter((m) => {
        if (m.age === null) return false;
        return m.age >= bracket.min && m.age <= bracket.max;
      }).length;

      return {
        ...bracket,
        count,
        percentage: decryptedMembers.length > 0 ? Math.round((count / decryptedMembers.length) * 100) : 0,
      };
    });

    return distribution;
  }, [decryptedMembers]);

  // Filtered members matching charts or search bar selection
  const filteredDisplayMembers = useMemo(() => {
    return decryptedMembers.filter((m) => {
      // 1. Birthplace filter
      if (selectedBirthplaceFilter) {
        const place = m.birthplace?.trim() || "Not Recorded";
        if (place !== selectedBirthplaceFilter) return false;
      }

      // 2. Age bracket filter
      if (selectedAgeBracketFilter) {
        if (m.age === null) return false;
        const bracket = AGE_BRACKETS.find(b => b.id === selectedAgeBracketFilter);
        if (!bracket) return false;
        if (m.age < bracket.min || m.age > bracket.max) return false;
      }

      // 3. Search text query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = m.name.toLowerCase().includes(q);
        const matchesRelation = m.relationshipToRoot?.toLowerCase().includes(q);
        const matchesPlace = m.birthplace?.toLowerCase().includes(q);
        return matchesName || matchesRelation || matchesPlace;
      }

      return true;
    });
  }, [decryptedMembers, selectedBirthplaceFilter, selectedAgeBracketFilter, searchQuery]);

  const clearFilters = () => {
    setSelectedBirthplaceFilter(null);
    setSelectedAgeBracketFilter(null);
  };

  return (
    <div className="space-y-6">
      {/* -----------------------------------------------------------------------------
          HEADER INFO CARD
         ----------------------------------------------------------------------------- */}
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <span className="text-[10px] bg-indigo-500/30 text-indigo-200 border border-indigo-400/20 px-2.5 py-1 rounded-full uppercase tracking-wider font-bold">
              Family Tree Analytics
            </span>
            <h3 className="text-xl font-bold tracking-tight">Macro-Level History & Insights</h3>
            <p className="text-xs text-indigo-200/85 max-w-xl leading-relaxed">
              Discover migration patterns, birthplace distributions, age demographics, and lineage statistics across your secure decrypted family tree database.
            </p>
          </div>
          <button
            onClick={() => setTreeSubView("visual")}
            className="self-start md:self-auto px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <span>Back to Interactive Tree</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* -----------------------------------------------------------------------------
          BENTO STATS GRID
         ----------------------------------------------------------------------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Members */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Tree Size</span>
            <span className="text-lg font-bold text-slate-900">{stats.total} Members</span>
            <span className="text-[9px] text-slate-400 block font-medium">({stats.livingCount} living)</span>
          </div>
        </div>

        {/* Avg Age */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Hourglass className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Average Age</span>
            <span className="text-lg font-bold text-slate-900">{stats.livingAvgAge || stats.avgAge || 0} yrs</span>
            <span className="text-[9px] text-slate-400 block font-medium">
              {stats.livingCount > 0 ? "For living members" : "Overall database"}
            </span>
          </div>
        </div>

        {/* Longest Generation Chain */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Generations</span>
            <span className="text-lg font-bold text-slate-900">{totalGenerations} Generations</span>
            <span className="text-[9px] text-slate-400 block font-medium">Recorded lineage depth</span>
          </div>
        </div>

        {/* Top Birthplace */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Globe className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Top Origin</span>
            <span className="text-sm font-bold text-slate-900 truncate block" title={stats.mostCommonBirthplace}>
              {stats.mostCommonBirthplace}
            </span>
            <span className="text-[9px] text-slate-400 block font-medium">
              {stats.mostCommonBirthplaceCount} members ({Math.round((stats.mostCommonBirthplaceCount / (stats.total || 1)) * 100)}%)
            </span>
          </div>
        </div>

        {/* Oldest Living/Deceased Elder */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs col-span-2 lg:col-span-1 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Award className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Oldest Elder</span>
            {stats.oldestMember ? (
              <>
                <span className="text-xs font-bold text-slate-900 truncate block">
                  {stats.oldestMember.name}
                </span>
                <span className="text-[9px] text-slate-500 block font-semibold">
                  Age {stats.oldestMember.age} {stats.oldestMember.isDeceased ? "(at death)" : ""}
                </span>
              </>
            ) : (
              <span className="text-xs text-slate-400 italic block">None decrypted</span>
            )}
          </div>
        </div>
      </div>

      {/* -----------------------------------------------------------------------------
          GENDER DIVERSITY BAR
         ----------------------------------------------------------------------------- */}
      <div className="bg-white border border-slate-200 p-4.5 rounded-2xl shadow-xs space-y-3">
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-indigo-500" />
            <span>Gender Distribution</span>
          </span>
          <div className="flex items-center gap-4 text-[10px] font-bold">
            <span className="flex items-center gap-1 text-blue-600">
              <span className="h-2 w-2 rounded-full bg-blue-500" /> Male ({stats.maleRatio}%)
            </span>
            <span className="flex items-center gap-1 text-rose-500">
              <span className="h-2 w-2 rounded-full bg-rose-400" /> Female ({stats.femaleRatio}%)
            </span>
            <span className="flex items-center gap-1 text-amber-500">
              <span className="h-2 w-2 rounded-full bg-amber-400" /> Other ({stats.otherRatio}%)
            </span>
          </div>
        </div>
        
        {/* Custom Stacking Progress Bar */}
        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
          {stats.maleRatio > 0 && (
            <div 
              style={{ width: `${stats.maleRatio}%` }} 
              className="bg-blue-500 h-full transition-all duration-500" 
              title={`Male: ${stats.maleRatio}%`}
            />
          )}
          {stats.femaleRatio > 0 && (
            <div 
              style={{ width: `${stats.femaleRatio}%` }} 
              className="bg-rose-400 h-full transition-all duration-500" 
              title={`Female: ${stats.femaleRatio}%`}
            />
          )}
          {stats.otherRatio > 0 && (
            <div 
              style={{ width: `${stats.otherRatio}%` }} 
              className="bg-amber-400 h-full transition-all duration-500" 
              title={`Other: ${stats.otherRatio}%`}
            />
          )}
        </div>
      </div>

      {/* -----------------------------------------------------------------------------
          CHARTS CONTAINER (BIRTHPLACES & DEMOGRAPHICS)
         ----------------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Birthplace Migration/Origin Distribution Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col">
          <div className="flex justify-between items-start pb-4 border-b border-slate-100">
            <div>
              <h4 className="font-sans font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Globe className="h-4.5 w-4.5 text-blue-600" />
                <span>Geographic Origins & Birthplaces</span>
              </h4>
              <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                Distribution of birthplace values to pinpoint ancestral roots. Click a bar to filter members.
              </p>
            </div>
            {selectedBirthplaceFilter && (
              <button 
                onClick={() => setSelectedBirthplaceFilter(null)}
                className="text-[10px] bg-blue-50 text-blue-600 font-bold border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer"
              >
                <span>Clear filter</span>
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto max-h-[340px] pt-4 pr-1 space-y-4">
            {birthplaceDistribution.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-10">No birthplaces recorded in database.</p>
            ) : (
              birthplaceDistribution.map((item) => {
                const isSelected = selectedBirthplaceFilter === item.place;
                return (
                  <div 
                    key={item.place}
                    onClick={() => setSelectedBirthplaceFilter(isSelected ? null : item.place)}
                    className={`group cursor-pointer p-2.5 rounded-xl border transition-all duration-200 ${
                      isSelected 
                        ? "bg-blue-50/50 border-blue-300 shadow-xs scale-[1.01]" 
                        : selectedBirthplaceFilter 
                        ? "opacity-50 border-transparent hover:opacity-85 hover:border-slate-100" 
                        : "border-transparent hover:bg-slate-50/75 hover:border-slate-100"
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1.5">
                      <span className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                        <span className="truncate max-w-[200px] text-slate-800">{item.place}</span>
                      </span>
                      <span className="font-mono text-slate-500 font-bold">
                        {item.count} {item.count === 1 ? "member" : "members"} ({item.percentage}%)
                      </span>
                    </div>

                    {/* Progress Bar Chart */}
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        style={{ width: `${item.percentage}%` }} 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isSelected ? "bg-blue-600" : "bg-blue-500/70 group-hover:bg-blue-600/85"
                        }`}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Age Demographics Distribution Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col">
          <div className="flex justify-between items-start pb-4 border-b border-slate-100">
            <div>
              <h4 className="font-sans font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <BarChart3 className="h-4.5 w-4.5 text-indigo-600" />
                <span>Age Demographics & Generations</span>
              </h4>
              <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                Demographic age group distributions of decrypted members. Click a bar to filter.
              </p>
            </div>
            {selectedAgeBracketFilter && (
              <button 
                onClick={() => setSelectedAgeBracketFilter(null)}
                className="text-[10px] bg-indigo-50 text-indigo-600 font-bold border border-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer"
              >
                <span>Clear filter</span>
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto max-h-[340px] pt-4 pr-1 space-y-4">
            {ageBracketDistribution.filter(b => b.count > 0).length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-10">
                Unlock insights by providing birthdates for family members. Only decrypted valid dates are compiled.
              </p>
            ) : (
              ageBracketDistribution.map((item) => {
                if (item.count === 0) return null; // Only show active brackets for density
                const isSelected = selectedAgeBracketFilter === item.id;
                return (
                  <div 
                    key={item.id}
                    onClick={() => setSelectedAgeBracketFilter(isSelected ? null : item.id)}
                    className={`group cursor-pointer p-2.5 rounded-xl border transition-all duration-200 ${
                      isSelected 
                        ? "bg-indigo-50/50 border-indigo-300 shadow-xs scale-[1.01]" 
                        : selectedAgeBracketFilter 
                        ? "opacity-50 border-transparent hover:opacity-85 hover:border-slate-100" 
                        : "border-transparent hover:bg-slate-50/75 hover:border-slate-100"
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1.5">
                      <span className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          Age {item.range}
                        </span>
                        <span className="text-slate-800 font-bold">{item.label}</span>
                      </span>
                      <span className="font-mono text-slate-500 font-bold">
                        {item.count} {item.count === 1 ? "member" : "members"} ({item.percentage}%)
                      </span>
                    </div>

                    {/* Progress Bar Chart */}
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        style={{ width: `${item.percentage}%` }} 
                        className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${item.color} ${
                          isSelected ? "opacity-100 shadow-sm" : "opacity-75 group-hover:opacity-100"
                        }`}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* -----------------------------------------------------------------------------
          FILTERED MEMBERS EXPLORER / LIST VIEW
         ----------------------------------------------------------------------------- */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        
        {/* Title & Explorer Filters */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <h4 className="font-sans font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <span>Interactive Demographic Explorer</span>
              <span className="text-xs bg-slate-100 text-slate-500 font-semibold px-2 py-0.5 rounded-full">
                {filteredDisplayMembers.length} Matching
              </span>
            </h4>
            <p className="text-[10px] text-slate-400 font-sans">
              Filter by birthplace or age demographics above, search, and focus members directly in the Interactive Tree.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search filter input */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 max-w-xs w-full">
              <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search matching names..."
                className="text-xs focus:outline-none bg-transparent w-full font-sans"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-xs text-slate-400 hover:text-slate-600">×</button>
              )}
            </div>

            {/* Clear active filters */}
            {(selectedBirthplaceFilter || selectedAgeBracketFilter) && (
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                <span>Clear Category Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Breadcrumbs indicator */}
        {(selectedBirthplaceFilter || selectedAgeBracketFilter) && (
          <div className="flex flex-wrap gap-2 items-center text-[10px] font-bold text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 w-fit">
            <span>Active Filters:</span>
            {selectedBirthplaceFilter && (
              <span className="bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span>Born in: {selectedBirthplaceFilter}</span>
                <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedBirthplaceFilter(null)} />
              </span>
            )}
            {selectedAgeBracketFilter && (
              <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span>Age group: {AGE_BRACKETS.find(b => b.id === selectedAgeBracketFilter)?.label}</span>
                <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedAgeBracketFilter(null)} />
              </span>
            )}
          </div>
        )}

        {/* Explorer Table Grid */}
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-xs text-left text-slate-600">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Name</th>
                <th className="px-5 py-3.5">Role / Relation</th>
                <th className="px-5 py-3.5">Age</th>
                <th className="px-5 py-3.5">Gender</th>
                <th className="px-5 py-3.5">Birthplace</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDisplayMembers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 italic font-sans">
                    No family members match your selected explorer filters.
                  </td>
                </tr>
              ) : (
                filteredDisplayMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          m.gender === Gender.MALE 
                            ? "bg-blue-100 text-blue-700" 
                            : m.gender === Gender.FEMALE 
                            ? "bg-rose-100 text-rose-700" 
                            : "bg-slate-100 text-slate-700"
                        }`}>
                          {m.name.charAt(0)}
                        </div>
                        <span className="truncate max-w-[150px]">{m.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase">
                        {m.relationshipToRoot || "Relative"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono">
                      {m.age !== null ? (
                        <span className="font-semibold text-slate-800">{m.age} yrs</span>
                      ) : (
                        <span className="text-slate-400 italic">No birthdate</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 capitalize font-medium">{m.gender}</td>
                    <td className="px-5 py-3.5 font-medium">
                      {m.birthplace ? (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          <span>{m.birthplace}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Not Recorded</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {m.isDeceased ? (
                        <span className="bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 w-fit">
                          Deceased
                        </span>
                      ) : (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 w-fit">
                          <Heart className="h-2 w-2 text-emerald-500 fill-emerald-500" />
                          <span>Living</span>
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => {
                          onSelectMember(m.id);
                          setTreeSubView("visual");
                        }}
                        className="p-1 px-2 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 text-[10px] font-bold rounded-lg border border-blue-100/60 transition-colors flex items-center gap-1 ml-auto cursor-pointer"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Focus Node</span>
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
