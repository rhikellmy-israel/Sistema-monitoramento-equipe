import React, { useEffect, useMemo, useState, useCallback } from "react";
import { createPortal } from "react-dom";
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

// ─── Main Component (Exact match to User Design Screenshot) ──────────────────

export default function GlobalAnnouncementAlert() {
  const { currentUser, announcements, markAnnouncementAsRead } = useData();

  const [activeAlert, setActiveAlert] = useState<Announcement | null>(null);
  const [sessionDismissed, setSessionDismissed] = useState<Set<string>>(new Set());
  const [photoError, setPhotoError] = useState(false);

  const userKey = currentUser?.email ?? currentUser?.id ?? "";
  const userRole = currentUser?.role ?? "";

  const closeCommunication = useCallback(() => {
    setActiveAlert(null);
    document.body.style.overflow = "";
  }, []);

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

  useEffect(() => {
    if (!nextUnread) return;
    if (activeAlert?.id === nextUnread.id) return;
    if (activeAlert) return;

    setActiveAlert(nextUnread);
    setPhotoError(false);
    document.body.style.overflow = "hidden";
  }, [nextUnread, activeAlert]);

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

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!activeAlert || !isValidAnnouncement(activeAlert)) return null;

  const isRanking = activeAlert.tipo === "ranking";
  const isImportante = activeAlert.tipo === "importante";
  const photoSrc = activeAlert.ranking_leader_photo || activeAlert.autor_foto;
  const leaderName = activeAlert.ranking_leader_name || activeAlert.autor || "Líder";
  const leaderScore = activeAlert.ranking_leader_score ?? 0;
  const runnerName = activeAlert.ranking_runner_up_name;
  const runnerScore = activeAlert.ranking_runner_up_score ?? 0;
  const dateFormatted = new Date(activeAlert.published_at ?? activeAlert.created_at ?? Date.now()).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return createPortal(
    <>
      {/* Dark Overlay Backdrop */}
      <div
        onClick={handleDismiss}
        className="fixed inset-0 z-[99998] bg-slate-950/85 backdrop-blur-xs"
      />

      {/* Modal Card — EXACT MATCH TO USER DESIGN SCREENSHOT */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[99999] w-[calc(100%-32px)] max-w-sm bg-[#0b1329] border border-slate-700/60 text-white rounded-[28px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col justify-between"
      >
        {/* Scrollable Body Container */}
        <div className="overflow-y-auto custom-scrollbar flex-1">
          {/* Header Visual Banner */}
          <div
            className={cn(
              "relative h-40 flex items-center justify-center p-4 text-center shrink-0",
              isRanking
                ? "bg-gradient-to-b from-amber-900/50 via-[#0b1329] to-[#0b1329]"
                : isImportante
                ? "bg-gradient-to-b from-rose-950/60 via-[#0b1329] to-[#0b1329]"
                : "bg-gradient-to-b from-indigo-950/60 via-[#0b1329] to-[#0b1329]"
            )}
          >
            {/* Close Button Top-Right */}
            <button
              type="button"
              onClick={handleDismiss}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer z-20 border border-slate-700/50"
              aria-label="Fechar comunicado"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Leader Photo with 👑 badge */}
            {isRanking && photoSrc && !photoError ? (
              <div className="relative mt-2">
                <img
                  src={photoSrc}
                  alt={leaderName}
                  onError={() => setPhotoError(true)}
                  className="w-22 h-22 rounded-full object-cover border-4 border-amber-400 shadow-xl shadow-amber-500/20"
                />
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-black text-xs shadow-md">
                  👑
                </div>
              </div>
            ) : (
              <div className="relative mt-2">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-4 border-amber-400 flex items-center justify-center text-white font-black text-xl shadow-xl">
                  {leaderName.substring(0, 2).toUpperCase()}
                </div>
                {isRanking && (
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-black text-xs shadow-md">
                    👑
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card Body Details */}
          <div className="px-6 pb-6 space-y-4">
            {/* Author Info Row */}
            <div className="flex items-center gap-2.5">
              {activeAlert.autor_foto ? (
                <img
                  src={activeAlert.autor_foto}
                  alt={activeAlert.autor}
                  className="w-7 h-7 rounded-full object-cover border border-slate-700"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-[10px]">
                  {(activeAlert.autor || "SLT").substring(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-xs font-bold text-slate-200 leading-none">
                  {activeAlert.autor || "Sistema SLT"}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{dateFormatted}</p>
              </div>
            </div>

            {/* Title / Headline */}
            <h3 className="text-base sm:text-lg font-black font-headline text-white leading-tight">
              {activeAlert.titulo}
            </h3>

            {/* Ranking Podium Scorecard */}
            {isRanking && leaderName && (
              <div className="bg-[#0e1938] rounded-2xl p-4 border border-amber-500/30 space-y-2.5 shadow-inner">
                {/* 1º Lugar */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base">🥇</span>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black text-amber-400 uppercase tracking-wider leading-none">
                        1º LUGAR
                      </p>
                      <p className="text-xs font-black text-white truncate mt-0.5">
                        {leaderName}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-black text-amber-400 shrink-0 ml-2">
                    {leaderScore.toLocaleString("pt-BR")} pts
                  </span>
                </div>

                {/* 2º Lugar */}
                {runnerName && (
                  <div className="flex items-center justify-between pt-0.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-sm">🥈</span>
                      <span className="text-xs font-bold text-slate-300 truncate">
                        {runnerName}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-400 shrink-0 ml-2">
                      {runnerScore.toLocaleString("pt-BR")} pts
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Message Body Text */}
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line font-medium">
              {activeAlert.mensagem}
            </p>
          </div>
        </div>

        {/* Action CTA Button */}
        <div className="p-4 bg-[#080e1f] border-t border-slate-800/80 shrink-0">
          <button
            type="button"
            onClick={handleDismiss}
            className={cn(
              "w-full py-3.5 rounded-2xl font-black font-headline text-xs uppercase tracking-wider shadow-lg transition-all active:scale-[0.98] cursor-pointer text-center",
              isRanking
                ? "bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 hover:from-amber-500 hover:to-amber-600 shadow-amber-500/20"
                : isImportante
                ? "bg-gradient-to-r from-rose-600 to-rose-700 text-white hover:from-rose-700 hover:to-rose-800 shadow-rose-600/20"
                : "bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 shadow-indigo-600/20"
            )}
          >
            ENTENDI
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
