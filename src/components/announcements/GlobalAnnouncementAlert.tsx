import React, { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, X, Megaphone, AlertTriangle, Star } from "lucide-react";
import { useData } from "../../context/DataContext";
import { Announcement } from "../../types";
import { cn } from "../../lib/utils";

// ─── Pre-flight Validation Helper ──────────────────────────────────────────

function isValidAnnouncement(ann: Announcement | null | undefined): ann is Announcement {
  if (!ann || typeof ann !== "object") return false;
  if (!ann.id || typeof ann.id !== "string" || !ann.id.trim()) return false;
  if (!ann.titulo || typeof ann.titulo !== "string" || !ann.titulo.trim()) return false;
  if (!ann.mensagem || typeof ann.mensagem !== "string" || !ann.mensagem.trim()) return false;
  if (ann.status !== "ativo") return false;
  return true;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function InitialsAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const initials = (name || "?")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white font-black select-none shrink-0",
        className
      )}
    >
      {initials || "?"}
    </div>
  );
}

// ─── Ranking Content Card ───────────────────────────────────────────────────

function RankingAlertCard({ ann }: { ann: Announcement }) {
  const [photoError, setPhotoError] = useState(false);
  const photoUrl = ann.ranking_leader_photo || ann.autor_foto;
  const leaderName = ann.ranking_leader_name || "Líder";

  return (
    <div className="flex flex-col items-center gap-2 sm:gap-3 w-full my-auto">
      {/* Photo with 👑 badge and onError fallback */}
      <div className="relative shrink-0">
        {photoUrl && !photoError ? (
          <img
            src={photoUrl}
            alt={leaderName}
            onError={() => setPhotoError(true)}
            className="w-14 h-14 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-amber-400 shadow-lg shadow-amber-500/30 shrink-0"
          />
        ) : (
          <InitialsAvatar
            name={leaderName}
            className="w-14 h-14 sm:w-20 sm:h-20 text-xl sm:text-2xl border-2 border-amber-400 shadow-lg"
          />
        )}
        <div className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center text-xs sm:text-sm shadow font-black">
          👑
        </div>
      </div>

      {/* Leader Name & Score */}
      <div className="text-center">
        <span className="inline-block text-[10px] font-black uppercase px-2 py-0.5 bg-amber-400/20 text-amber-300 rounded-md border border-amber-400/30 mb-0.5">
          🥇 1º Lugar
        </span>
        <h3 className="text-sm sm:text-lg font-black text-white truncate max-w-[240px] leading-tight">
          {leaderName}
        </h3>
        <p className="text-sm sm:text-base font-black text-amber-400">
          {(ann.ranking_leader_score || 0).toLocaleString("pt-BR")} pts
        </p>
      </div>

      {/* Runner Up */}
      {ann.ranking_runner_up_name && (
        <div className="w-full bg-slate-800/80 rounded-xl px-3 py-2 border border-slate-700/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm shrink-0">🥈</span>
            <span className="font-bold text-slate-200 truncate">
              {ann.ranking_runner_up_name}
            </span>
          </div>
          <span className="font-black text-slate-300 shrink-0 ml-2">
            {(ann.ranking_runner_up_score || 0).toLocaleString("pt-BR")} pts
          </span>
        </div>
      )}

      {/* Point Difference Box */}
      {ann.ranking_diff != null && ann.ranking_diff > 0 && ann.ranking_runner_up_name && (
        <div className="w-full bg-amber-500/15 border border-amber-500/30 rounded-xl p-2.5 text-center">
          <p className="text-[11px] sm:text-xs font-medium text-amber-200 leading-snug">
            🔥 Faltam{" "}
            <strong className="text-amber-300 font-black">
              {ann.ranking_diff.toLocaleString("pt-BR")}{" "}
              {ann.ranking_diff === 1 ? "ponto" : "pontos"}
            </strong>{" "}
            para <strong className="text-white">{ann.ranking_runner_up_name}</strong> ultrapassar{" "}
            <strong className="text-white">{leaderName}</strong>!
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Generic Content Card ───────────────────────────────────────────────────

function GenericAlertCard({ ann }: { ann: Announcement }) {
  const Icon =
    ann.tipo === "importante"
      ? AlertTriangle
      : ann.tipo === "ranking"
      ? Trophy
      : Megaphone;

  const iconColor =
    ann.tipo === "importante"
      ? "text-rose-400"
      : ann.tipo === "ranking"
      ? "text-amber-400"
      : "text-indigo-400";

  return (
    <div className="flex flex-col items-center gap-3 w-full my-auto text-center">
      <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
        <Icon className={cn("w-7 h-7", iconColor)} />
      </div>
      <p className="text-xs sm:text-sm font-medium text-slate-200 leading-relaxed whitespace-pre-line max-h-[40vh] overflow-y-auto custom-scrollbar px-1">
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

  // 1. Centralized Cleanup Function
  const closeCommunication = useCallback(() => {
    setActiveAlert(null);
    document.body.style.overflow = "";
  }, []);

  // 2. Pre-flight Candidate Selection & Validation
  const nextUnreadCandidate = useMemo<Announcement | null>(() => {
    if (!userKey || !currentUser) return null;

    try {
      const eligible = announcements.filter((a) => {
        if (!isValidAnnouncement(a)) return false;
        if (a.destinatarios !== "todos" && a.destinatarios !== userRole) return false;
        const readList = a.lido_por || [];
        if (readList.includes(userKey)) return false;
        if (sessionDismissed.has(a.id)) return false;
        return true;
      });

      if (eligible.length === 0) return null;

      const typePriority = (t: string) =>
        t === "ranking" ? 0 : t === "importante" ? 1 : 2;

      eligible.sort((a, b) => {
        const tp = typePriority(a.tipo) - typePriority(b.tipo);
        if (tp !== 0) return tp;
        const ta = new Date(a.published_at ?? a.created_at).getTime();
        const tb = new Date(b.published_at ?? b.created_at).getTime();
        return tb - ta;
      });

      return eligible[0];
    } catch (err) {
      console.error("[GlobalAlert] Erro ao selecionar candidato:", err);
      return null;
    }
  }, [announcements, userKey, userRole, sessionDismissed, currentUser]);

  // 3. Open Modal ONLY after Candidate is Validated
  useEffect(() => {
    if (!nextUnreadCandidate) return;
    if (activeAlert?.id === nextUnreadCandidate.id) return;

    if (!activeAlert && isValidAnnouncement(nextUnreadCandidate)) {
      setActiveAlert(nextUnreadCandidate);
    }
  }, [nextUnreadCandidate, activeAlert]);

  // 4. Watchdog & Body Scroll Lock
  useEffect(() => {
    if (activeAlert) {
      if (!isValidAnnouncement(activeAlert)) {
        console.warn("[GlobalAlert Watchdog] Announcement inválido detectado, fechando...");
        closeCommunication();
        return;
      }
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [activeAlert, closeCommunication]);

  // 5. Confirm / Dismiss Handler
  const handleDismiss = useCallback(() => {
    if (!activeAlert) return;
    try {
      markAnnouncementAsRead(activeAlert.id, userKey);
      setSessionDismissed((prev) => new Set([...prev, activeAlert.id]));
    } catch (err) {
      console.error("[GlobalAlert] Erro ao marcar leitura:", err);
    } finally {
      closeCommunication();
    }
  }, [activeAlert, markAnnouncementAsRead, userKey, closeCommunication]);

  const isRanking = activeAlert?.tipo === "ranking";

  return (
    <AnimatePresence>
      {activeAlert && isValidAnnouncement(activeAlert) && (
        <motion.div
          key={activeAlert.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleDismiss();
          }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85"
          style={{
            paddingTop: "max(12px, env(safe-area-inset-top))",
            paddingBottom: "max(12px, env(safe-area-inset-bottom))",
          }}
        >
          <div
            className={cn(
              "relative w-full max-w-sm sm:max-w-md my-auto flex flex-col justify-between rounded-3xl overflow-hidden shadow-2xl border border-slate-700/70 text-white",
              "max-h-[calc(100dvh-24px)] sm:max-h-[88vh]",
              isRanking
                ? "bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950/90"
                : activeAlert.tipo === "importante"
                ? "bg-gradient-to-b from-slate-900 via-slate-900 to-rose-950/90"
                : "bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950/90"
            )}
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
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center transition-colors shrink-0 ml-2 cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body Content */}
            <div className="flex-1 flex flex-col justify-center items-center px-4 py-2 sm:py-3 min-h-0 overflow-hidden">
              {isRanking ? (
                <RankingAlertCard ann={activeAlert} />
              ) : (
                <GenericAlertCard ann={activeAlert} />
              )}
            </div>

            {/* Author Subtitle */}
            <div className="px-4 py-1 text-center shrink-0">
              <p className="text-[10px] text-slate-400 font-medium">
                Por <strong className="text-slate-300">{activeAlert.autor || "Sistema SLT"}</strong> ·{" "}
                {new Date(
                  activeAlert.published_at ?? activeAlert.created_at ?? Date.now()
                ).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </p>
            </div>

            {/* Action CTA Button */}
            <div className="p-3 sm:p-4 bg-slate-950/40 border-t border-slate-800/80 shrink-0">
              <button
                onClick={handleDismiss}
                className={cn(
                  "w-full py-3 sm:py-3.5 rounded-2xl font-black font-headline text-sm uppercase tracking-wider shadow-lg transition-all active:scale-[0.98] cursor-pointer",
                  isRanking
                    ? "bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-amber-950 shadow-amber-500/25"
                    : activeAlert.tipo === "importante"
                    ? "bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white shadow-rose-600/25"
                    : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-indigo-600/25"
                )}
              >
                ENTENDI
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
