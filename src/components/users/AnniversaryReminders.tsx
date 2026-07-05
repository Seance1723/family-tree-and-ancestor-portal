import React, { useState, useMemo } from "react";
import { AnniversaryReminder, FamilyMember } from "../../types";
import { Plus, Bell, Calendar, Trash2, Gift, Heart, User, Clock } from "lucide-react";
import { decryptData } from "../../utils/crypto";

interface AnniversaryRemindersProps {
  reminders: AnniversaryReminder[];
  members: FamilyMember[];
  onAddReminder: (rem: AnniversaryReminder) => void;
  onDeleteReminder: (rem: AnniversaryReminder) => void;
  masterKey: string;
}

export default function AnniversaryReminders({
  reminders,
  members,
  onAddReminder,
  onDeleteReminder,
  masterKey,
}: AnniversaryRemindersProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState<"birthday" | "wedding" | "death" | "anniversary">("birthday");
  const [memberId, setMemberId] = useState("");
  const [remindDaysBefore, setRemindDaysBefore] = useState(7);

  // Compute upcoming events based on both custom reminders AND automated member birthdates!
  const upcomingEvents = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const list: Array<{
      id: string;
      title: string;
      daysRemaining: number;
      actualDate: string;
      type: "birthday" | "wedding" | "death" | "anniversary";
      memberName?: string;
      rawReminder?: AnniversaryReminder;
    }> = [];

    const getDaysRemaining = (eventMonth: number, eventDay: number) => {
      let eventDate = new Date(currentYear, eventMonth, eventDay);
      if (eventDate < today) {
        // If date already passed this year, compute for next year
        eventDate = new Date(currentYear + 1, eventMonth, eventDay);
      }
      const diffTime = eventDate.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    // 1. ADD AUTOMATED MEMBER BIRTHDAYS
    members.forEach((m) => {
      const bdateRaw = decryptData(m.birthdate, masterKey);
      if (!bdateRaw || bdateRaw.startsWith("🔒") || bdateRaw.startsWith("❌")) return;

      const dateParts = bdateRaw.split("-");
      if (dateParts.length !== 3) return;

      const birthMonth = parseInt(dateParts[1], 10) - 1;
      const birthDay = parseInt(dateParts[2], 10);

      const daysRemaining = getDaysRemaining(birthMonth, birthDay);

      list.push({
        id: `auto-birthday-${m.id}`,
        title: `${m.name}'s Birthday`,
        daysRemaining,
        actualDate: `${dateParts[1]}-${dateParts[2]}`,
        type: "birthday",
        memberName: m.name,
      });
    });

    // 2. ADD USER CONFIGURED REMINDERS
    reminders.forEach((r) => {
      if (!r.date) return;
      const dateParts = r.date.split("-"); // YYYY-MM-DD or MM-DD
      let month = 0;
      let day = 0;

      if (dateParts.length === 3) {
        month = parseInt(dateParts[1], 10) - 1;
        day = parseInt(dateParts[2], 10);
      } else if (dateParts.length === 2) {
        month = parseInt(dateParts[0], 10) - 1;
        day = parseInt(dateParts[1], 10);
      } else {
        return;
      }

      const daysRemaining = getDaysRemaining(month, day);
      const linkedMember = members.find((m) => m.id === r.memberId);

      list.push({
        id: r.id,
        title: r.title,
        daysRemaining,
        actualDate: r.date,
        type: r.type,
        memberName: linkedMember?.name,
        rawReminder: r,
      });
    });

    // Sort by soonest first
    return list.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [reminders, members, masterKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    const newReminder: AnniversaryReminder = {
      id: "rem_" + Math.random().toString(36).substr(2, 9),
      userId: "", // Will be set by sync engine
      memberId,
      title,
      date, // YYYY-MM-DD
      type,
      remindDaysBefore,
      createdAt: Date.now(),
    };

    onAddReminder(newReminder);
    
    // Reset Form
    setTitle("");
    setDate("");
    setMemberId("");
    setType("birthday");
  };

  const getEventIcon = (t: "birthday" | "wedding" | "death" | "anniversary") => {
    switch (t) {
      case "birthday":
        return <Gift className="h-4 w-4 text-rose-500" />;
      case "wedding":
        return <Heart className="h-4 w-4 text-emerald-500 fill-emerald-50" />;
      case "death":
        return <Clock className="h-4 w-4 text-gray-500" />;
      default:
        return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Reminder Config Form */}
      <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 h-fit">
        <div>
          <h3 className="font-sans font-semibold text-slate-900 text-base">Set Anniversary Reminder</h3>
          <p className="text-xs text-slate-500 mt-1">
            Get alerts for recurring birthdays, memorial services, or ancestral anniversaries.
          </p>
        </div>

        <form id="reminder-config-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Event Title *</label>
            <input
              id="rem-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Mother & Father Wedding Anniversary"
              className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-blue-600 font-sans"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Date *</label>
              <input
                id="rem-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-blue-600 font-sans"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Event Type</label>
              <select
                id="rem-type"
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-blue-600 font-sans bg-white"
              >
                <option value="birthday">Birthday</option>
                <option value="wedding">Wedding Anniversary</option>
                <option value="death">Memorial / Death Date</option>
                <option value="anniversary">Other Anniversary</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Link to Family Member</label>
            <select
              id="rem-member"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-blue-600 font-sans bg-white"
            >
              <option value="">-- Optional (Unlinked Reminder) --</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.relationshipToRoot || "Relative"})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Notify Days Before</label>
            <input
              id="rem-notify-days"
              type="number"
              min={1}
              max={60}
              value={remindDaysBefore}
              onChange={(e) => setRemindDaysBefore(parseInt(e.target.value, 10) || 7)}
              className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-blue-600 font-sans"
            />
          </div>

          <button
            id="btn-save-reminder"
            type="submit"
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
          >
            Create Alert Active
          </button>
        </form>
      </div>

      {/* Countdown Timeline */}
      <div className="lg:col-span-2 space-y-4">
        <div>
          <h3 className="font-sans font-semibold text-slate-900 text-base">Automated Timeline Calendar</h3>
          <p className="text-xs text-slate-500 mt-1">
            Scans family birthdays and custom reminders automatically to ensure you never miss ancestral events.
          </p>
        </div>

        {upcomingEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-80 border border-dashed border-slate-200 rounded-2xl bg-white p-8 text-center">
            <Bell className="h-10 w-10 text-slate-400 mb-3" />
            <h4 className="font-sans font-medium text-sm text-slate-900">No Upcoming Events</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Add family members with birthdates or add custom alerts on the left panel.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.map((event) => {
              const isCrit = event.daysRemaining <= 14;

              return (
                <div
                  id={`event-item-${event.id}`}
                  key={event.id}
                  className={`bg-white border p-4 rounded-2xl flex items-center justify-between shadow-sm transition-all hover:shadow-md ${
                    isCrit ? "border-amber-100 bg-amber-50/10" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl ${
                      event.type === "birthday" 
                        ? "bg-rose-50 text-rose-600" 
                        : event.type === "wedding" 
                          ? "bg-emerald-50 text-emerald-600" 
                          : event.type === "death" 
                            ? "bg-slate-100 text-slate-600" 
                            : "bg-blue-50 text-blue-600"
                    }`}>
                      {getEventIcon(event.type)}
                    </div>
                    
                    <div>
                      <h4 className="font-sans font-semibold text-xs text-slate-900 flex items-center gap-2">
                        <span>{event.title}</span>
                        {isCrit && (
                          <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">
                            Soon!
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <span>Calendar: {event.actualDate}</span>
                        {event.memberName && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="font-medium text-slate-600 flex items-center gap-1">
                              <User className="h-3 w-3" /> {event.memberName}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-mono font-bold text-xs text-blue-700">{event.daysRemaining} Days</p>
                      <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Remaining</p>
                    </div>

                    {event.rawReminder ? (
                      <button
                        id={`btn-delete-reminder-${event.id}`}
                        onClick={() => onDeleteReminder(event.rawReminder!)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                        title="Delete custom reminder"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : (
                      // Automated member birthdate (cannot be deleted directly, but must edit the member birthdate instead)
                      <span className="p-1.5 text-[10px] text-slate-300 font-mono italic" title="Automated Birthday from tree">
                        Auto
                      </span>
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
