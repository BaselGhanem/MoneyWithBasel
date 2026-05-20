// automation.js — Money with Basel
// Runs on dashboard load via dashboard.html -> runPendingCommitments()
// This file exposes helpers for manual use if needed.

async function checkAndRunCommitments(uid) {
  const commitments = await DB.getCommitments(uid);
  const now = new Date();
  const due = commitments.filter(c => {
    if (!c.isActive) return false;
    const next = c.nextRunDate?.toDate ? c.nextRunDate.toDate() : new Date(c.nextRunDate);
    return next <= now;
  });
  for (const c of due) {
    await DB.processCommitment(c);
  }
  return due.length;
}

function getNextRunDate(dayOfMonth) {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
  if (next <= now) next.setMonth(next.getMonth() + 1);
  return next;
}

window.Automation = { checkAndRunCommitments, getNextRunDate };
