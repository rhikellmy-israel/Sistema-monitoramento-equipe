import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Trophy, X, Megaphone, AlertTriangle } from "lucide-react";
import { useData } from "../../context/DataContext";
import { Announcement } from "../../types";
import { cn } from "../../lib/utils";

// ─── Pre-flight Validation ──────────────────────────────────────────────────

function isValidAnnouncement(ann: Announcement | null | undefined): ann is Announcement {
  if (!ann || typeof ann !== "object") return false;
  if (!ann.id || typeof ann.id !== "string" || !ann.id.trim()) return false;
  if (!ann.titulo || typeof ann.titulo !== "string" || !ann.titulo.trim()) return false;
  if (!ann.mensagem || typeof ann.mensagem !== "string" || !ann.mensagem.trim()) return false;
  if (ann.status !== "ativo") return false;
  return true;
}

// ─── Initials Avatar ────────────────────────────────────────────────────────

function InitialsAvatar({ name, size }: { name: string; size: string }) {
  const initials = (name || "?")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

  return (
    <div
      className={cn(
        "rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white font-black flex items-center justify-center select-none shrink-0 border-2 border-amber-400",
        size
      )}
    >
      {initials}
    </div>
  );
}

// ─── Ranking Card ───────────────────────────────────────────────────────────

function RankingCard({ ann }: { ann: Announcement }) {
  const [photoError, setPhotoError] = useState(false);
  const photoSrc = ann.ranking_leader_photo || ann.autor_foto;
  const leaderName = ann.ranking_leader_name || "Líder";
  const leaderScore = ann.ranking_leader_score ?? 0;
  const runnerName = ann.ranking_runner_up_name;
  const runnerScore = ann.ranking_runner_up_score ?? 0;
  const diff = ann.ranking_diff ?? 0;

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      {/* Photo */}
      <div className="relative shrink-0">
        {photoSrc && !photoError ? (
          <img
            src={photoSrc}
            alt={leaderName}
            width={64}
            height={64}
            onError={() => setPhotoError(true)}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-amber-400 shadow-lg shadow-amber-400/30"
            style={{ minWidth: "64px", minHeight: "64px" }}
          />
        ) : (
          <InitialsAvatar name={leaderName} size="w-16 h-16 sm:w-20 sm:h-20 text-xl" />
        )}
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center text-xs shadow font-black">
          👑
        </div>
      </div>

      {/* Leader info */}
      <div className="text-center">
        <span className="inline-block text-[10px] font-black uppercase px-2 py-0.5 bg-amber-400/20 text-amber-300 rounded-md border border-amber-400/30">
          🥇 1º Lugar
        </span>
        <p className="text-base sm:text-lg font-black text-white mt-0.5 truncate max-w-[220px]">
          {leaderName}
        </p>
        <p className="text-sm font-black text-amber-400">
          {leaderScore.toLocaleString("pt-BR")} pts
        </p>
      </div>

      {/* Runner-up */}
      {runnerName && (
        <div className="w-full bg-white/10 rounded-xl px-3 py-2 border border-white/15 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm shrink-0">🥈</span>
            <span className="font-bold text-slate-200 truncate">{runnerName}</span>
          </div>
          <span className="font-black text-slate-300 ml-2 shrink-0">
            {runnerScore.toLocaleString("pt-BR")} pts
          </span>
        </div>
      )}

      {/* Diff */}
      {diff > 0 && runnerName && (
        <div className="w-full bg-amber-500/15 border border-amber-500/30 rounded-xl p-2.5 text-center">
          <p className="text-[11px] sm:text-xs font-medium text-amber-200 leading-snug">
            🔥 Faltam{" "}
            <strong className="text-amber-300 font-black">
              {diff.toLocaleString("pt-BR")} {diff === 1 ? "ponto" : "pontos"}
            </strong>{" "}
            para <strong className="text-white">{runnerName}</strong> ultrapassar{" "}
            <strong className="text-white">{leaderName}</strong>!
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Generic Card ───────────────────────────────────────────────────────────

function GenericCard({ ann }: { ann: Announcement }) {
  const Icon = ann.tipo === "importante" ? AlertTriangle : ann.tipo === "ranking" ? Trophy : Megaphone;
  const color = ann.tipo === "importante" ? "text-rose-400" : ann.tipo === "ranking" ? "text-amber-400" : "text-indigo-400";

  return (
    <div className="flex flex-col items-center gap-3 w-full text-center">
      <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
        <Icon className={cn("w-7 h-7", color)} />
      </div>
      <p className="text-xs sm:text-sm font-medium text-slate-200 leading-relaxed whitespace-pre-line px-1">
        {ann.mensagem}
      </p>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function GlobalAnnouncementAlert() {
  const { currentUser, announcements, markAnnouncementAsRead } = useData();

  // --- State ---
  // `pendingAlert`: validated announcement waiting to be shown
  // `activeAlert`: currently shown (controls overlay visibility)
  // `isVisible`: CSS transition trigger (separate from DOM mount for smooth enter/exit)
  const [activeAlert, setActiveAlert] = useState<Announcement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [sessionDismissed, setSessionDismissed] = useState<Set<string>>(new Set());

  const userKey = currentUser?.email ?? currentUser?.id ?? "";
  const userRole = currentUser?.role ?? "";

  // Watchdog timeout ref — auto-close if something goes wrong
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Centralized close logic ---
  const closeCommunication = useCallback(() => {
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
    setIsVisible(false);
    // Delay actual unmount to allow CSS exit transition
    setTimeout(() => {
      setActiveAlert(null);
      document.body.style.overflow = "";
    }, 200);
  }, []);

  // --- Find next unread announcement ---
  const nextUnread = useMemo<Announcement | null>(() => {
    if (!userKey || !currentUser) return null;
    try {
      const eligible = announcements.filter((a) => {
        if (!isValidAnnouncement(a)) return false;
        if (a.destinatarios !== "todos" && a.destinatarios !== userRole) return false;
        if ((a.lido_por || []).includes(userKey)) return false;
        if (sessionDismissed.has(a.id)) return false;
        return true;
      });
      if (eligible.length === 0) return null;

      const typePriority = (t: string) => (t === "ranking" ? 0 : t === "importante" ? 1 : 2);
      eligible.sort((a, b) => {
        const tp = typePriority(a.tipo) - typePriority(b.tipo);
        if (tp !== 0) return tp;
        return new Date(b.published_at ?? b.created_at).getTime() - new Date(a.published_at ?? a.created_at).getTime();
      });
      return eligible[0];
    } catch (err) {
      console.error("[GlobalAlert] Erro ao selecionar comunicado:", err);
      return null;
    }
  }, [announcements, userKey, userRole, sessionDismissed, currentUser]);

  // --- Open modal when valid unread found ---
  useEffect(() => {
    if (!nextUnread) return;
    if (activeAlert?.id === nextUnread.id) return;
    if (activeAlert) return; // Don't interrupt current one

    if (!isValidAnnouncement(nextUnread)) {
      console.warn("[GlobalAlert] Comunicado inválido descartado:", nextUnread);
      return;
    }

    // Mount content FIRST, then trigger CSS opacity transition on next frame
    setActiveAlert(nextUnread);
    document.body.style.overflow = "hidden";

    // Use rAF to ensure the DOM is painted before triggering the visible transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    });

    // Watchdog: auto-close after 30s in case something goes wrong
    watchdogRef.current = setTimeout(() => {
      console.warn("[GlobalAlert Watchdog] Timeout atingido, fechando automaticamente.");
      closeCommunication();
    }, 30000);
  }, [nextUnread, activeAlert, closeCommunication]);

  // --- Dismiss handler ---
  const handleDismiss = useCallback(() => {
    if (!activeAlert) return;
    try {
      markAnnouncementAsRead(activeAlert.id, userKey);
      setSessionDismissed((prev) => new Set([...prev, activeAlert.id]));
    } catch (err) {
      console.error("[GlobalAlert] Erro ao marcar leitura:", err);
    }
    closeCommunication();
  }, [activeAlert, markAnnouncementAsRead, userKey, closeCommunication]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
    };
  }, []);

  // FAIL-SAFE: if activeAlert is null or invalid, render NOTHING — no overlay, no blur
  if (!activeAlert || !isValidAnnouncement(activeAlert)) return null;

  const isRanking = activeAlert.tipo === "ranking";
  const bgGrad = isRanking
    ? "from-slate-900 via-slate-900 to-amber-950/90"
    : activeAlert.tipo === "importante"
    ? "from-slate-900 via-slate-900 to-rose-950/90"
    : "from-slate-900 via-slate-900 to-indigo-950/90";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        paddingTop: "max(12px, env(safe-area-inset-top))",
        paddingBottom: "max(12px, env(safe-area-inset-bottom))",
        paddingLeft: "12px",
        paddingRight: "12px",
        // Use CSS transitions instead of framer-motion to avoid animation failures on mobile
        backgroundColor: isVisible ? "rgba(2, 6, 23, 0.85)" : "rgba(2, 6, 23, 0)",
        transition: "background-color 150ms ease-out",
      }}
    >
      {/* Modal panel — CSS transition, not framer-motion, for guaranteed rendering */}
      <div
        className={cn(
          "relative w-full max-w-sm sm:max-w-md flex flex-col rounded-3xl overflow-hidden shadow-2xl border border-slate-700/70 text-white bg-gradient-to-b",
          "max-h-[calc(100dvh-24px)] sm:max-h-[88vh]",
          bgGrad
        )}
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateY(0) scale(1)" : "translateY(16px) scale(0.95)",
          transition: "opacity 180ms ease-out, transform 180ms ease-out",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-slate-800/80 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {isRanking ? (
              <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
            ) : activeAlert.tipo === "importante" ? (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : (
              <Megaphone className="w-5 h-5 text-indigo-400 shrink-0" />
            )}
            <h2 className="text-xs sm:text-sm font-black text-white truncate font-headline uppercase tracking-wider">
              {activeAlert.titulo}
            </h2>
          </div>
          <button
            onClick={handleDismiss}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 text-slate-300 flex items-center justify-center transition-colors shrink-0 ml-2 cursor-pointer border border-white/10"
            aria-label="Fechar comunicado"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col justify-center items-center px-4 py-3 min-h-0 overflow-hidden">
          {isRanking ? <RankingCard ann={activeAlert} /> : <GenericCard ann={activeAlert} />}
        </div>

        {/* Author line */}
        <div className="px-4 py-1 text-center shrink-0">
          <p className="text-[10px] text-slate-400">
            Por <strong className="text-slate-300">{activeAlert.autor || "Sistema SLT"}</strong> ·{" "}
            {new Date(activeAlert.published_at ?? activeAlert.created_at ?? Date.now()).toLocaleDateString("pt-BR")}
          </p>
        </div>

        {/* CTA Button */}
        <div className="p-3 sm:p-4 bg-slate-950/40 border-t border-slate-800/80 shrink-0">
          <button
            onClick={handleDismiss}
            className={cn(
              "w-full py-3 sm:py-3.5 rounded-2xl font-black font-headline text-sm uppercase tracking-wider shadow-lg transition-all active:scale-[0.97] cursor-pointer",
              isRanking
                ? "bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-amber-950"
                : activeAlert.tipo === "importante"
                ? "bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white"
                : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white"
            )}
          >
            ENTENDI
          </button>
        </div>
      </div>
    </div>
  );
}
