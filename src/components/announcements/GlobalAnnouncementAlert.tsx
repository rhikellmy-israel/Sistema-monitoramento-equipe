import React, { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, X, Megaphone, AlertTriangle, Star } from "lucide-react";
import { useData } from "../../context/DataContext";
import { Announcement } from "../../types";
import { cn } from "../../lib/utils";

// ─── Helpers ────────────────────────────────────────────────────────────────

function InitialsAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white font-black select-none",
        className
      )}
    >
      {initials}
    </div>
  );
}

// ─── Ranking Alert Card ──────────────────────────────────────────────────────

function RankingAlertCard({ ann }: { ann: Announcement }) {
  return (
    <div className="flex flex-col items-center gap-3 sm:gap-4 w-full">
      {/* Leader photo */}
      <div className="relative shrink-0">
        {ann.ranking_leader_photo || ann.autor_foto ? (
          <img
            src={ann.ranking_leader_photo ?? ann.autor_foto}
            alt={ann.ranking_leader_name ?? "Lider"}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-amber-400 shadow-xl shadow-amber-500/30"
          />
        ) : (
          <InitialsAvatar
            name={ann.ranking_leader_name ?? "?"}
            className="w-20 h-20 sm:w-24 sm:h-24 text-2xl sm:text-3xl border-4 border-amber-400 shadow-xl"
          />
        )}
        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-400 text-amber-900 flex items-center justify-center text-base shadow-lg font-black">
          👑
        </div>
      </div>

      {/* Scoreboard */}
      <div className="w-full bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden">
        {/* 1st place */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg shrink-0">🥇</span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                1º Lugar
              </p>
              <p className="text-sm sm:text-base font-black text-white truncate max-w-[140px] sm:max-w-[200px]">
                {ann.ranking_leader_name}
              </p>
            </div>
          </div>
          <span className="text-base sm:text-lg font-black text-amber-400 shrink-0 ml-2">
            {ann.ranking_leader_score?.toLocaleString("pt-BR")} pts
          </span>
        </div>

        {/* 2nd place */}
        {ann.ranking_runner_up_name && (
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg shrink-0">🥈</span>
              <p className="text-sm font-bold text-slate-200 truncate max-w-[140px] sm:max-w-[200px]">
                {ann.ranking_runner_up_name}
              </p>
            </div>
            <span className="text-sm font-bold text-slate-300 shrink-0 ml-2">
              {ann.ranking_runner_up_score?.toLocaleString("pt-BR")} pts
            </span>
          </div>
        )}
      </div>

      {/* Competitive difference message */}
      {ann.ranking_diff != null && ann.ranking_diff > 0 && ann.ranking_runner_up_name && (
        <div className="w-full bg-amber-500/20 border border-amber-500/40 rounded-xl px-4 py-3 text-center">
          <p className="text-xs sm:text-sm font-bold text-amber-200 leading-snug">
            🔥 Faltam apenas{" "}
            <span className="text-amber-300 font-black">
              {ann.ranking_diff.toLocaleString("pt-BR")}{" "}
              {ann.ranking_diff === 1 ? "ponto" : "pontos"}
            </span>{" "}
            para{" "}
            <span className="font-black">{ann.ranking_runner_up_name}</span>{" "}
            ultrapassar{" "}
            <span className="font-black">{ann.ranking_leader_name}</span> e
            assumir a liderança!
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Generic Alert Card ──────────────────────────────────────────────────────

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
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
        <Icon className={cn("w-8 h-8", iconColor)} />
      </div>
      <p className="text-sm font-medium text-slate-300 leading-relaxed text-center whitespace-pre-line line-clamp-6 sm:line-clamp-none">
        {ann.mensagem}
      </p>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

/**
 * GlobalAnnouncementAlert
 *
 * Mounts globally inside AuthenticatedLayout (in App.tsx).
 * Watches `announcements` from DataContext for items the current user has NOT read.
 * Picks the most recent unread, high-priority (ranking first) announcement and
 * displays it as a full-screen modal overlay on any page.
 *
 * Clicking "ENTENDI" marks the announcement as read via markAnnouncementAsRead,
 * which persists to Supabase so other sessions also see the updated lido_por list.
 *
 * Works on first login AND when a new announcement arrives via Supabase Realtime
 * (already subscribed in DataContext — no extra polling needed).
 */
export default function GlobalAnnouncementAlert() {
  const { currentUser, announcements, markAnnouncementAsRead } = useData();

  const [activeAlert, setActiveAlert] = useState<Announcement | null>(null);
  // Guard: prevent the same announcement from re-appearing within a session
  const [sessionDismissed, setSessionDismissed] = useState<Set<string>>(new Set());

  const userKey = currentUser?.email ?? currentUser?.id ?? "";
  const userRole = currentUser?.role ?? "";

  /** Pick the next unread announcement for this user */
  const nextUnread = useMemo<Announcement | null>(() => {
    if (!userKey || !currentUser) return null;

    const eligible = announcements.filter((a) => {
      if (a.status !== "ativo") return false;
      if (a.destinatarios !== "todos" && a.destinatarios !== userRole) return false;
      if ((a.lido_por ?? []).includes(userKey)) return false;
      if (sessionDismissed.has(a.id)) return false;
      return true;
    });

    if (eligible.length === 0) return null;

    // Priority: ranking > importante > informativo; then newest first
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
  }, [announcements, userKey, userRole, sessionDismissed, currentUser]);

  /** Open modal when a new unread announcement is found */
  useEffect(() => {
    if (!nextUnread) return;
    // Don't interrupt if same alert is already showing
    if (activeAlert?.id === nextUnread.id) return;
    // Only open when no alert is visible (user must dismiss first)
    if (!activeAlert) {
      setActiveAlert(nextUnread);
    }
  }, [nextUnread, activeAlert]);

  /** User clicked "ENTENDI" — mark as read and close */
  const handleDismiss = useCallback(() => {
    if (!activeAlert) return;
    markAnnouncementAsRead(activeAlert.id, userKey);
    setSessionDismissed((prev) => new Set([...prev, activeAlert.id]));
    setActiveAlert(null);
  }, [activeAlert, markAnnouncementAsRead, userKey]);

  const isRanking = activeAlert?.tipo === "ranking";

  const bgGradient = isRanking
    ? "from-slate-950 via-amber-950/80 to-slate-900"
    : activeAlert?.tipo === "importante"
    ? "from-slate-950 via-rose-950/70 to-slate-900"
    : "from-slate-950 via-indigo-950/70 to-slate-900";

  return (
    <AnimatePresence>
      {activeAlert && (
        <motion.div
          key={activeAlert.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md"
          style={{ touchAction: "none" }}
        >
          <motion.div
            initial={{ scale: 0.93, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.93, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className={cn(
              "relative w-full max-w-md bg-gradient-to-b rounded-3xl shadow-2xl border border-white/10",
              "flex flex-col overflow-hidden",
              // Mobile: up to full dynamic viewport height with safe margin; Desktop: auto
              "max-h-[calc(100dvh-24px)] sm:max-h-[88vh]",
              bgGradient
            )}
          >
            {/* Close X button */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Fechar comunicado"
            >
              <X className="w-4 h-4 text-white" />
            </button>

            {/* Ambient glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.15),transparent_70%)] pointer-events-none" />

            {/* ── Scrollable content ────────────────────── */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-7 pt-6 sm:pt-7 pb-2 space-y-3 sm:space-y-4">
              {/* Type label + title */}
              <div className="flex flex-col items-center gap-1 text-center">
                <div className="flex items-center gap-2">
                  {isRanking ? (
                    <Trophy className="w-5 h-5 text-amber-400" />
                  ) : activeAlert.tipo === "importante" ? (
                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                  ) : (
                    <Megaphone className="w-5 h-5 text-indigo-400" />
                  )}
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                    {isRanking
                      ? "Comunicado de Ranking"
                      : activeAlert.tipo === "importante"
                      ? "Aviso Importante"
                      : "Comunicado"}
                  </span>
                </div>
                <h2 className="text-base sm:text-xl font-black text-white leading-snug px-4 text-balance">
                  {activeAlert.titulo}
                </h2>
              </div>

              {/* Content */}
              {isRanking ? (
                <RankingAlertCard ann={activeAlert} />
              ) : (
                <GenericAlertCard ann={activeAlert} />
              )}

              {/* Author + date */}
              <div className="flex items-center justify-center gap-2 pt-1 pb-1">
                {activeAlert.autor_foto ? (
                  <img
                    src={activeAlert.autor_foto}
                    alt={activeAlert.autor}
                    className="w-6 h-6 rounded-full object-cover border border-white/20"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center">
                    <Star className="w-3 h-3 text-slate-400" />
                  </div>
                )}
                <p className="text-[11px] text-slate-400 font-medium">
                  {activeAlert.autor} ·{" "}
                  {new Date(
                    activeAlert.published_at ?? activeAlert.created_at
                  ).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            {/* ── Fixed footer / CTA ────────────────────── */}
            <div className="shrink-0 px-5 sm:px-7 py-4 sm:py-5 bg-black/20 border-t border-white/10">
              <button
                onClick={handleDismiss}
                className={cn(
                  "w-full py-3.5 sm:py-4 rounded-2xl font-black font-headline text-sm sm:text-base uppercase tracking-wider",
                  "shadow-lg transition-all active:scale-[0.97] cursor-pointer",
                  isRanking
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-amber-950 shadow-amber-500/30"
                    : activeAlert?.tipo === "importante"
                    ? "bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white shadow-rose-600/30"
                    : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-indigo-600/30"
                )}
              >
                Entendi
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
