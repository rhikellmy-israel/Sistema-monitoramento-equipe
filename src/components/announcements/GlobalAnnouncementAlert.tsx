import React, { useEffect, useMemo, useState, useCallback } from "react";
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
        "rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white font-black flex items-center justify-center select-none shrink-0 border-2 border-amber-400 shadow-md",
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
  const leaderName = ann.ranking_leader_name || ann.autor || "Líder";
  const leaderScore = ann.ranking_leader_score ?? 0;
  const runnerName = ann.ranking_runner_up_name;
  const runnerScore = ann.ranking_runner_up_score ?? 0;
  const diff = ann.ranking_diff ?? 0;

  return (
    <div className="flex flex-col items-center gap-2.5 w-full text-center">
      {/* Photo */}
      <div className="relative shrink-0">
        {photoSrc && !photoError ? (
          <img
            src={photoSrc}
            alt={leaderName}
            onError={() => setPhotoError(true)}
            className="w-14 h-14 sm:w-18 sm:h-18 rounded-full object-cover border-2 border-amber-400 shadow-lg shadow-amber-400/30"
          />
        ) : (
          <InitialsAvatar name={leaderName} size="w-14 h-14 sm:w-18 sm:h-18 text-xl" />
        )}
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center text-[10px] shadow font-black">
          👑
        </div>
      </div>

      {/* Leader info */}
      <div className="text-center space-y-0.5">
        <span className="inline-block text-[10px] font-black uppercase px-2 py-0.5 bg-amber-400/20 text-amber-300 rounded-md border border-amber-400/30">
          🥇 1º Lugar
        </span>
        <p className="text-sm sm:text-base font-black text-white truncate max-w-[200px]">
          {leaderName}
        </p>
        <p className="text-xs sm:text-sm font-black text-amber-400">
          {leaderScore.toLocaleString("pt-BR")} pts
        </p>
      </div>

      {/* Runner-up */}
      {runnerName && (
        <div className="w-full bg-white/10 rounded-xl px-3 py-1.5 border border-white/15 flex items-center justify-between text-xs">
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
        <div className="w-full bg-amber-500/15 border border-amber-500/30 rounded-xl p-2 text-center">
          <p className="text-[11px] font-medium text-amber-200 leading-snug">
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
    <div className="flex flex-col items-center gap-2.5 w-full text-center">
      <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
        <Icon className={cn("w-6 h-6", color)} />
      </div>
      <p className="text-xs sm:text-sm font-medium text-slate-200 leading-relaxed whitespace-pre-line max-h-[35vh] overflow-y-auto custom-scrollbar px-1">
        {ann.mensagem}
      </p>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function GlobalAnnouncementAlert() {
  const { currentUser, announcements, markAnnouncementAsRead } = useData();

  const [activeAlert, setActiveAlert] = useState<Announcement | null>(null);
  const [sessionDismissed, setSessionDismissed] = useState<Set<string>>(new Set());

  const userKey = currentUser?.email ?? currentUser?.id ?? "";
  const userRole = currentUser?.role ?? "";

  // --- Centralized close logic ---
  const closeCommunication = useCallback(() => {
    setActiveAlert(null);
    document.body.style.overflow = "";
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

  // --- Open modal directly when valid unread is found ---
  useEffect(() => {
    if (!nextUnread) return;
    if (activeAlert?.id === nextUnread.id) return;
    if (activeAlert) return;

    setActiveAlert(nextUnread);
    document.body.style.overflow = "hidden";
  }, [nextUnread, activeAlert]);

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
    };
  }, []);

  // FAIL-SAFE: if activeAlert is null or invalid, render NOTHING
  if (!activeAlert || !isValidAnnouncement(activeAlert)) return null;

  const isRanking = activeAlert.tipo === "ranking";
  const isImportante = activeAlert.tipo === "importante";

  const borderColor = isRanking
    ? "border-t-amber-400"
    : isImportante
    ? "border-t-rose-500"
    : "border-t-indigo-500";

  return (
    <>
      {/* Dark Overlay Backdrop — Fixed Fullscreen */}
      <div
        onClick={handleDismiss}
        className="fixed inset-0 z-[99998] bg-slate-950/85"
      />

      {/* Modal Card — EXACT MATHEMATICAL VIEWPORT CENTER: position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); */}
      <div
        className={cn(
          "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[99999]",
          "w-[calc(100%-24px)] max-w-xs sm:max-w-md bg-slate-900 border border-slate-700/80 text-white rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col gap-3 border-t-4 max-h-[85vh] overflow-y-auto custom-scrollbar",
          borderColor
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {isRanking ? (
              <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
            ) : isImportante ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <Megaphone className="w-4 h-4 text-indigo-400 shrink-0" />
            )}
            <h2 className="text-xs sm:text-sm font-black text-white truncate font-headline uppercase tracking-wider">
              {activeAlert.titulo}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center transition-colors shrink-0 ml-2 cursor-pointer border border-white/10"
            aria-label="Fechar comunicado"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="py-0.5">
          {isRanking && activeAlert.ranking_leader_name ? (
            <RankingCard ann={activeAlert} />
          ) : (
            <GenericCard ann={activeAlert} />
          )}
        </div>

        {/* Author Subtitle */}
        <div className="text-center text-[10px] text-slate-400 shrink-0">
          Por <strong className="text-slate-300">{activeAlert.autor || "Sistema SLT"}</strong> ·{" "}
          {new Date(activeAlert.published_at ?? activeAlert.created_at ?? Date.now()).toLocaleDateString("pt-BR")}
        </div>

        {/* Action CTA Button */}
        <div className="pt-1 shrink-0">
          <button
            type="button"
            onClick={handleDismiss}
            className={cn(
              "w-full py-3 rounded-2xl font-black font-headline text-xs sm:text-sm uppercase tracking-wider shadow-lg transition-all active:scale-[0.98] cursor-pointer text-center",
              isRanking
                ? "bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 hover:from-amber-500 hover:to-amber-600 shadow-amber-500/25"
                : isImportante
                ? "bg-gradient-to-r from-rose-600 to-rose-700 text-white hover:from-rose-700 hover:to-rose-800 shadow-rose-600/25"
                : "bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 shadow-indigo-600/25"
            )}
          >
            ENTENDI
          </button>
        </div>
      </div>
    </>
  );
}
