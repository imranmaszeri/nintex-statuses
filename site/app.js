const DATA_URL = 'data/nintex-uptime.json';

const impactRank = {
  none: 0,
  maintenance: 1,
  minor: 2,
  major: 3,
};

const impactLabel = {
  none: 'Operational',
  maintenance: 'Maintenance',
  minor: 'Minor',
  major: 'Major',
};

const impactSummary = {
  none: 'Operational',
  maintenance: 'Maintenance',
  minor: 'Partial outage',
  major: 'Major outage',
};

// Status.io status codes → impact string
const statusToImpact = (code) => {
  if (code === 100) return 'none';
  if (code === 200) return 'maintenance';
  if (code === 300 || code === 400) return 'minor';
  if (code === 500) return 'major';
  return 'none';
};

const STATUS_META_VARIANTS = new Set(['default', 'stacked', 'cards', 'compact']);
const DEFAULT_STATUS_META_VARIANT = 'cards';
const STATUS_META_MOBILE_QUERY = window.matchMedia('(max-width: 520px)');

const getStatusMetaVariant = () => {
  const variant = new URLSearchParams(window.location.search).get('meta') || DEFAULT_STATUS_META_VARIANT;
  return STATUS_META_VARIANTS.has(variant) ? variant : DEFAULT_STATUS_META_VARIANT;
};

const statusMetaVariant = getStatusMetaVariant();
document.documentElement.dataset.statusMeta = statusMetaVariant;
const statusMetaState = {
  lastUpdated: null,
  recentIncidentCount: 0,
};
const SHARE_IMAGE_SIZE = {
  width: 1600,
  height: 840,
};
const SHARE_FILE_NAME = 'nintex-status-90-day-uptime.png';
const SHARE_ICON_PATHS = {
  ready:
    'M5 2.75C5 1.78 5.78 1 6.75 1h5.5C13.22 1 14 1.78 14 2.75v6.5c0 .97-.78 1.75-1.75 1.75h-5.5C5.78 11 5 10.22 5 9.25v-6.5Zm1.75-.25a.25.25 0 0 0-.25.25v6.5c0 .14.11.25.25.25h5.5a.25.25 0 0 0 .25-.25v-6.5a.25.25 0 0 0-.25-.25h-5.5ZM3.75 5A.75.75 0 0 1 4.5 5.75v6c0 .41.34.75.75.75h5a.75.75 0 0 1 0 1.5h-5A2.25 2.25 0 0 1 3 11.75v-6A.75.75 0 0 1 3.75 5Z',
  loading:
    'M5 2.75C5 1.78 5.78 1 6.75 1h5.5C13.22 1 14 1.78 14 2.75v6.5c0 .97-.78 1.75-1.75 1.75h-5.5C5.78 11 5 10.22 5 9.25v-6.5Zm1.75-.25a.25.25 0 0 0-.25.25v6.5c0 .14.11.25.25.25h5.5a.25.25 0 0 0 .25-.25v-6.5a.25.25 0 0 0-.25-.25h-5.5ZM3.75 5A.75.75 0 0 1 4.5 5.75v6c0 .41.34.75.75.75h5a.75.75 0 0 1 0 1.5h-5A2.25 2.25 0 0 1 3 11.75v-6A.75.75 0 0 1 3.75 5Z',
  copied: 'M13.78 3.72a.75.75 0 0 1 0 1.06L6.81 11.75a.75.75 0 0 1-1.06 0L2.22 8.22a.75.75 0 1 1 1.06-1.06l3 3 6.44-6.44a.75.75 0 0 1 1.06 0Z',
  downloaded:
    'M8 1.75a.75.75 0 0 1 .75.75v6.19l1.72-1.72a.75.75 0 1 1 1.06 1.06L8.53 11.1a.75.75 0 0 1-1.06 0L4.47 8.03a.75.75 0 1 1 1.06-1.06L7.25 8.69V2.5A.75.75 0 0 1 8 1.75Zm-4.5 11a.75.75 0 0 0 0 1.5h9a.75.75 0 0 0 0-1.5h-9Z',
  error:
    'M8 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Zm0 3a.75.75 0 0 0-.75.75v3.4c0 .41.34.75.75.75s.75-.34.75-.75v-3.4A.75.75 0 0 0 8 4.5Zm0 6.75a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8Z',
};
const shareState = {
  lastUpdated: null,
  recentIncidentCount: 0,
  uptime: null,
  daySeverity: [],
  imageBlob: null,
  imageReady: false,
  imagePreparing: false,
};
let shareResetTimeout = null;
let shareDownloadUrl = null;
const shareStateMeta = {
  ready: {
    label: 'Copy card',
    tooltip: 'Copy a clean PNG to clipboard',
    feedback: '',
    tone: '',
  },
  loading: {
    label: 'Preparing…',
    tooltip: 'Preparing a shareable PNG',
    feedback: 'Preparing a shareable PNG…',
    tone: '',
  },
  copied: {
    label: 'Copied',
    tooltip: 'Image copied',
    feedback: 'Image copied. Paste it anywhere.',
    tone: 'success',
  },
  downloaded: {
    label: 'Downloaded',
    tooltip: 'PNG downloaded',
    feedback: 'Clipboard was unavailable, so the PNG was downloaded instead.',
    tone: 'downloaded',
  },
  error: {
    label: 'Try again',
    tooltip: 'Unable to copy right now',
    feedback: 'Unable to create the share image right now.',
    tone: 'error',
  },
};

const formatDate = (date) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);

const formatTime = (date) =>
  new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(date);

const getDayStartUTC = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const dayStartUTC = getDayStartUTC;

const clipInterval = (start, end, rangeStart, rangeEnd) => {
  const startMs = Math.max(start.getTime(), rangeStart.getTime());
  const endMs = Math.min(end.getTime(), rangeEnd.getTime());
  if (endMs <= startMs) return null;
  return [new Date(startMs), new Date(endMs)];
};

const mergeIntervals = (intervals) => {
  if (!intervals.length) return [];
  const sorted = intervals.slice().sort((a, b) => a[0] - b[0]);
  const merged = [sorted[0]];
  for (let i = 1; i < sorted.length; i += 1) {
    const last = merged[merged.length - 1];
    const current = sorted[i];
    if (current[0] <= last[1]) {
      last[1] = new Date(Math.max(last[1].getTime(), current[1].getTime()));
    } else {
      merged.push(current);
    }
  }
  return merged;
};

const minuteIndex = (date) => Math.floor(date.getTime() / 60000);

const minutesBetween = (start, end) => {
  const startMin = minuteIndex(start);
  const endMin = Math.ceil(end.getTime() / 60000);
  return Math.max(0, endMin - startMin);
};

const formatDuration = (minutes) => {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  const parts = [];
  if (hours) parts.push(`${hours} hr${hours === 1 ? '' : 's'}`);
  if (mins) parts.push(`${mins} min${mins === 1 ? '' : 's'}`);
  if (!parts.length) return '0 mins';
  return parts.join(' ');
};

const countsAsDowntime = (impact) => impact === 'minor' || impact === 'major';

// Resolve the [start, end] interval for a Status.io incident object.
// Prefers overlap_start/overlap_end; falls back to datetime_open + duration (minutes).
// Parse a Status.io date string as UTC.
// API returns "YYYY-MM-DD HH:MM:SS" (space-separated, no tz) — must be treated as UTC.
// ISO strings like "2026-01-27T09:59:00.000Z" are already fine.
const parseStatusIoDate = (str) => {
  if (!str) return null;
  const s = String(str).trim();
  // If it has a T or Z it's already ISO — pass through
  if (s.includes('T') || s.includes('Z') || s.includes('+')) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // "YYYY-MM-DD HH:MM:SS" → append Z to force UTC interpretation
  const d = new Date(s.replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime()) ? null : d;
};

// Parse Status.io duration strings: "14h 1m", "24h", "42m", "1h 30m" → minutes
const parseDurationMinutes = (str) => {
  if (!str) return 0;
  if (typeof str === 'number') return str;
  const s = String(str);
  const hours = s.match(/(\d+)\s*h/);
  const mins = s.match(/(\d+)\s*m/);
  return (hours ? parseInt(hours[1], 10) * 60 : 0) + (mins ? parseInt(mins[1], 10) : 0);
};

// Resolve the [start, end] interval for a Status.io incident object.
// Prefers overlap_start/overlap_end (parsed as UTC); falls back to datetime_open + duration.
const incidentInterval = (incident) => {
  const start = parseStatusIoDate(incident.overlap_start);
  const end = parseStatusIoDate(incident.overlap_end);
  if (start && end && end > start) return [start, end];
  const open = parseStatusIoDate(incident.datetime_open);
  const durationMs = parseDurationMinutes(incident.duration) * 60 * 1000;
  if (open && durationMs > 0) return [open, new Date(open.getTime() + durationMs)];
  return null;
};

const formatIncidentCount = (count) => `${count} incident${count === 1 ? '' : 's'}`;
const shouldUseAlternateStatusMeta = () =>
  statusMetaVariant !== 'default' && STATUS_META_MOBILE_QUERY.matches;

const setStatusMetaItem = (element, label, value) => {
  if (!element) return;
  element.replaceChildren();
  if (label) {
    const labelEl = document.createElement('span');
    labelEl.className = 'status-meta-label';
    labelEl.textContent = label;
    element.appendChild(labelEl);
  }
  const valueEl = document.createElement('span');
  valueEl.className = 'status-meta-value';
  valueEl.textContent = value;
  element.appendChild(valueEl);
  element.setAttribute('aria-label', label ? `${label} ${value}` : value);
};

const renderStatusMeta = (lastUpdated, recentIncidentCount) => {
  statusMetaState.lastUpdated = lastUpdated;
  statusMetaState.recentIncidentCount = recentIncidentCount;

  const lastUpdatedEl = document.getElementById('lastUpdated');
  const incidentCountEl = document.getElementById('incidentCount');
  if (!lastUpdatedEl || !incidentCountEl) return;

  const dateText = formatDate(lastUpdated);
  const incidentText = formatIncidentCount(recentIncidentCount);

  if (!shouldUseAlternateStatusMeta()) {
    lastUpdatedEl.textContent = `Last updated ${dateText}`;
    incidentCountEl.textContent = `${incidentText} in last 90 days`;
    lastUpdatedEl.removeAttribute('aria-label');
    incidentCountEl.removeAttribute('aria-label');
    return;
  }

  switch (statusMetaVariant) {
    case 'stacked':
      setStatusMetaItem(lastUpdatedEl, 'Updated', dateText);
      setStatusMetaItem(incidentCountEl, 'Incidents', `${recentIncidentCount} in last 90 days`);
      break;
    case 'cards':
      setStatusMetaItem(lastUpdatedEl, 'Last updated', dateText);
      setStatusMetaItem(incidentCountEl, 'Last 90 days', incidentText);
      break;
    case 'compact':
      setStatusMetaItem(lastUpdatedEl, null, `Updated ${dateText}`);
      setStatusMetaItem(incidentCountEl, null, `${incidentText} / 90d`);
      break;
    default:
      lastUpdatedEl.textContent = `Last updated ${dateText}`;
      incidentCountEl.textContent = `${incidentText} in last 90 days`;
      break;
  }
};

const rerenderStatusMeta = () => {
  if (!statusMetaState.lastUpdated) return;
  renderStatusMeta(statusMetaState.lastUpdated, statusMetaState.recentIncidentCount);
};

const clearShareDownloadUrl = () => {
  if (!shareDownloadUrl) return;
  URL.revokeObjectURL(shareDownloadUrl);
  shareDownloadUrl = null;
};

const setShareFeedback = (message = '', tone = '') => {
  const feedback = document.getElementById('heroShareStatus');
  if (!feedback) return;
  feedback.textContent = message;
  if (message) {
    feedback.dataset.visible = 'true';
  } else {
    delete feedback.dataset.visible;
  }
  if (tone) {
    feedback.dataset.tone = tone;
  } else {
    delete feedback.dataset.tone;
  }
};

const setShareButtonState = (state, override = {}) => {
  const button = document.getElementById('copyHeroImage');
  const labelEl = document.getElementById('copyHeroImageLabel');
  const icon = document.getElementById('copyHeroImageIcon');
  if (!button || !labelEl || !icon) return;
  const meta = {
    ...(shareStateMeta[state] || shareStateMeta.ready),
    ...override,
  };
  button.dataset.state = state;
  button.dataset.tooltip = meta.tooltip || '';
  labelEl.textContent = meta.label;
  icon.setAttribute('d', SHARE_ICON_PATHS[state] || SHARE_ICON_PATHS.ready);
  setShareFeedback(meta.feedback ?? '', meta.tone || '');
};

const queueShareButtonReset = () => {
  if (shareResetTimeout) {
    window.clearTimeout(shareResetTimeout);
  }
  shareResetTimeout = window.setTimeout(() => {
    if (shareState.imageReady) {
      setShareButtonState('ready');
    } else if (shareState.imagePreparing) {
      setShareButtonState('loading');
    } else {
      setShareButtonState('ready');
    }
  }, 2200);
};

const setShareDownloadLink = (blob) => {
  const download = document.getElementById('downloadHeroImage');
  if (!download) return null;
  clearShareDownloadUrl();
  shareDownloadUrl = URL.createObjectURL(blob);
  download.href = shareDownloadUrl;
  download.hidden = false;
  return download;
};

const triggerShareDownload = (blob) => {
  const download = setShareDownloadLink(blob);
  if (download) {
    download.click();
  }
};

const dataUrlToBlob = (dataUrl) => {
  const [meta, encoded] = dataUrl.split(',');
  const mimeMatch = meta.match(/data:(.*?);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const binary = window.atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
};

const roundedRectPath = (ctx, x, y, width, height, radius) => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
};

const fillRadialGlow = (ctx, x, y, radius, color) => {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
};

const drawRoundedRect = (ctx, x, y, width, height, radius, fillStyle, strokeStyle = null, lineWidth = 1) => {
  ctx.save();
  roundedRectPath(ctx, x, y, width, height, radius);
  ctx.fillStyle = fillStyle;
  ctx.fill();
  if (strokeStyle) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();
  }
  ctx.restore();
};

const drawMetaPill = (ctx, x, y, width, height, label, value) => {
  const pillGradient = ctx.createLinearGradient(x, y, x, y + height);
  pillGradient.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
  pillGradient.addColorStop(1, 'rgba(246, 248, 250, 0.96)');
  drawRoundedRect(ctx, x, y, width, height, 22, pillGradient, 'rgba(208, 215, 222, 0.92)', 2);

  ctx.fillStyle = '#57606a';
  ctx.font = '700 15px "IBM Plex Sans", system-ui, sans-serif';
  ctx.fillText(label.toUpperCase(), x + 22, y + 28);

  ctx.fillStyle = '#24292f';
  ctx.font = '600 26px "IBM Plex Sans", system-ui, sans-serif';
  ctx.fillText(value, x + 22, y + 64);
};

const drawLegendItem = (ctx, x, y, color, label) => {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y - 5, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#57606a';
  ctx.font = '600 24px "IBM Plex Sans", system-ui, sans-serif';
  ctx.fillText(label, x + 20, y + 4);
  ctx.restore();
};

const renderShareImageCanvas = () => {
  if (!shareState.daySeverity.length || shareState.uptime === null || !shareState.lastUpdated) {
    throw new Error('Share image is not ready yet.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = SHARE_IMAGE_SIZE.width;
  canvas.height = SHARE_IMAGE_SIZE.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas is not available.');
  }

  const { width, height } = canvas;
  const backgroundGradient = ctx.createLinearGradient(0, height, width, 0);
  backgroundGradient.addColorStop(0, '#edf5fb');
  backgroundGradient.addColorStop(0.45, '#f7f8fc');
  backgroundGradient.addColorStop(1, '#fff1eb');
  ctx.fillStyle = backgroundGradient;
  ctx.fillRect(0, 0, width, height);

  fillRadialGlow(ctx, width * 0.18, height * 0.78, 300, 'rgba(31, 111, 235, 0.22)');
  fillRadialGlow(ctx, width * 0.18, height * 0.18, 220, 'rgba(45, 164, 78, 0.15)');
  fillRadialGlow(ctx, width * 0.83, height * 0.2, 260, 'rgba(207, 34, 46, 0.18)');
  fillRadialGlow(ctx, width * 0.62, height * 0.56, 240, 'rgba(217, 119, 6, 0.14)');

  ctx.save();
  ctx.filter = 'blur(72px)';
  const ambientGradient = ctx.createLinearGradient(260, 240, 1340, 520);
  ambientGradient.addColorStop(0, 'rgba(31, 111, 235, 0.18)');
  ambientGradient.addColorStop(0.28, 'rgba(45, 164, 78, 0.16)');
  ambientGradient.addColorStop(0.65, 'rgba(217, 119, 6, 0.16)');
  ambientGradient.addColorStop(1, 'rgba(207, 34, 46, 0.18)');
  drawRoundedRect(ctx, 260, 222, 1080, 360, 64, ambientGradient);
  ctx.restore();

  const frameMarginX = 110;
  const frameMarginY = 118;
  const cardX = frameMarginX;
  const cardY = frameMarginY;
  const cardWidth = width - frameMarginX * 2;
  const cardHeight = height - frameMarginY * 2;

  ctx.save();
  ctx.shadowColor = 'rgba(17, 18, 26, 0.18)';
  ctx.shadowBlur = 70;
  ctx.shadowOffsetY = 28;
  const cardGradient = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardHeight);
  cardGradient.addColorStop(0, 'rgba(255, 255, 255, 0.99)');
  cardGradient.addColorStop(1, 'rgba(248, 250, 252, 0.98)');
  drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 40, cardGradient);
  ctx.restore();
  drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 40, 'rgba(255, 255, 255, 0)', 'rgba(208, 215, 222, 0.95)', 2);

  const insetX = cardX + 64;
  const insetRight = cardX + cardWidth - 64;
  const titleBaselineY = cardY + 104;
  const pillWidth = 238;
  const pillHeight = 80;
  const pillGap = 16;
  const pillsWidth = pillWidth * 2 + pillGap;
  const pillX = insetRight - pillsWidth;
  const pillY = cardY + 40;

  ctx.fillStyle = '#24292f';
  ctx.font = '700 52px "Space Grotesk", "IBM Plex Sans", sans-serif';
  ctx.fillText('Last 90 days uptime', insetX, titleBaselineY);

  drawMetaPill(ctx, pillX, pillY, pillWidth, pillHeight, 'Last updated', formatDate(shareState.lastUpdated));
  drawMetaPill(
    ctx,
    pillX + pillWidth + pillGap,
    pillY,
    pillWidth,
    pillHeight,
    'Last 90 days',
    `${shareState.recentIncidentCount} incident${shareState.recentIncidentCount === 1 ? '' : 's'}`,
  );

  const rowBaselineY = cardY + 204;
  ctx.fillStyle = '#24292f';
  ctx.font = '600 38px "Space Grotesk", "IBM Plex Sans", sans-serif';
  ctx.fillText('Nintex Platform', insetX, rowBaselineY);

  const uptimeLabel = `${(shareState.uptime * 100).toFixed(2)}% uptime`;
  ctx.fillStyle = '#57606a';
  ctx.font = '600 42px "IBM Plex Sans", system-ui, sans-serif';
  const uptimeWidth = ctx.measureText(uptimeLabel).width;
  ctx.fillText(uptimeLabel, insetRight - uptimeWidth, rowBaselineY);

  const barsTop = cardY + 252;
  const barsHeight = 64;
  const barGap = 4;
  const barWidth = (cardWidth - 128 - barGap * (shareState.daySeverity.length - 1)) / shareState.daySeverity.length;
  const barColors = {
    0: 'rgba(45, 164, 78, 0.82)',
    1: 'rgba(31, 111, 235, 0.82)',
    2: 'rgba(217, 119, 6, 0.84)',
    3: 'rgba(207, 34, 46, 0.84)',
  };

  shareState.daySeverity.forEach((severity, index) => {
    const x = insetX + index * (barWidth + barGap);
    drawRoundedRect(ctx, x, barsTop, barWidth, barsHeight, 5, barColors[severity] || barColors[0]);
  });

  ctx.fillStyle = '#57606a';
  ctx.font = '500 24px "IBM Plex Sans", system-ui, sans-serif';
  ctx.fillText('90 days ago', insetX, barsTop + barsHeight + 40);
  const todayLabel = 'Today';
  const todayWidth = ctx.measureText(todayLabel).width;
  ctx.fillText(todayLabel, insetRight - todayWidth, barsTop + barsHeight + 40);

  const legendY = cardY + cardHeight - 84;
  let legendX = insetX;
  const legendItems = [
    ['rgba(45, 164, 78, 0.92)', 'Operational'],
    ['rgba(31, 111, 235, 0.92)', 'Maintenance'],
    ['rgba(217, 119, 6, 0.92)', 'Minor'],
    ['rgba(207, 34, 46, 0.92)', 'Major'],
  ];
  ctx.font = '600 24px "IBM Plex Sans", system-ui, sans-serif';
  legendItems.forEach(([color, label]) => {
    drawLegendItem(ctx, legendX, legendY, color, label);
    legendX += ctx.measureText(label).width + 62;
  });

  const attribution = 'status.nintex.com';
  ctx.fillStyle = '#57606a';
  ctx.font = '600 24px "IBM Plex Sans", system-ui, sans-serif';
  const attributionWidth = ctx.measureText(attribution).width;
  ctx.fillText(attribution, insetRight - attributionWidth, legendY + 4);

  return canvas;
};

const createShareImageBlob = () => {
  const canvas = renderShareImageCanvas();
  return dataUrlToBlob(canvas.toDataURL('image/png'));
};

const getShareImageBlob = () => {
  if (shareState.imageBlob) {
    return shareState.imageBlob;
  }
  const blob = createShareImageBlob();
  shareState.imageBlob = blob;
  shareState.imageReady = true;
  return blob;
};

const primeShareImage = async () => {
  if (shareState.imagePreparing || shareState.imageReady || !shareState.daySeverity.length) return;
  shareState.imagePreparing = true;
  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready.catch(() => {});
    }
    shareState.imageBlob = createShareImageBlob();
    shareState.imageReady = true;
    setShareButtonState('ready');
  } catch (error) {
    console.error(error);
    shareState.imageBlob = null;
    shareState.imageReady = false;
    setShareButtonState('ready');
  } finally {
    shareState.imagePreparing = false;
  }
};

const scheduleSharePrime = () => {
  const runner = () => {
    void primeShareImage();
  };
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(runner, { timeout: 600 });
  } else {
    window.setTimeout(runner, 60);
  }
};

const bindShareAction = () => {
  const copyButton = document.getElementById('copyHeroImage');
  if (!copyButton || copyButton.dataset.bound === 'true') return;

  copyButton.dataset.bound = 'true';
  copyButton.addEventListener('click', async () => {
    if (shareState.imagePreparing) {
      setShareButtonState('loading', {
        feedback: 'Preparing the PNG. Try again in a moment.',
      });
      return;
    }

    try {
      if (!shareState.imageReady) {
        setShareButtonState('loading');
        await primeShareImage();
      }

      const blob = getShareImageBlob();

      if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
        clearShareDownloadUrl();
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob,
          }),
        ]);
        setShareButtonState('copied');
        queueShareButtonReset();
      } else {
        triggerShareDownload(blob);
        setShareButtonState('downloaded');
        queueShareButtonReset();
      }
    } catch (error) {
      console.error(error);
      try {
        const blob = getShareImageBlob();
        triggerShareDownload(blob);
        setShareButtonState('downloaded', {
          feedback: 'Clipboard was blocked here, so the PNG was downloaded instead.',
        });
        queueShareButtonReset();
      } catch (fallbackError) {
        console.error(fallbackError);
        setShareButtonState('error');
        queueShareButtonReset();
      }
    }
  });
};

if (typeof STATUS_META_MOBILE_QUERY.addEventListener === 'function') {
  STATUS_META_MOBILE_QUERY.addEventListener('change', rerenderStatusMeta);
} else if (typeof STATUS_META_MOBILE_QUERY.addListener === 'function') {
  STATUS_META_MOBILE_QUERY.addListener(rerenderStatusMeta);
}

const monthStartUTC = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

const addMonthsUTC = (date, delta) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, 1));

const daysInMonthUTC = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();

// Extract unique incidents from a component's days array and incidents array, deduplicating by id.
// Returns a Map<id, { id, name, datetime_open, duration, overlap_start, overlap_end, impact }>
const extractIncidents = (component, rangeStart, rangeEnd) => {
  const seen = new Map();
  
  // Extract from days array (if present)
  (component.days || []).forEach((day) => {
    (day.incidents || []).forEach((incident) => {
      const id = incident.id || incident.name;
      if (!id) return;
      const impact = statusToImpact(day.status);
      if (!seen.has(id) || impactRank[impact] > impactRank[seen.get(id).impact]) {
        seen.set(id, { ...incident, impact });
      }
    });
  });
  
  // Extract from component.incidents array (from API)
  (component.incidents || []).forEach((incident) => {
    const id = incident.id;
    if (!id) return;
    // Determine impact from the incident status
    const impact = incident.impact || 'none';
    if (!seen.has(id) || impactRank[impact] > impactRank[seen.get(id).impact]) {
      seen.set(id, { ...incident, impact });
    }
  });
  
  return seen;
};

// Build per-component incident intervals (minute-level) for uptime calculation
const componentIntervals = (component) => {
  const intervals = [];
  
  // Extract from days array (if present)
  (component.days || []).forEach((day) => {
    const impact = statusToImpact(day.status);
    if (!countsAsDowntime(impact)) return;
    (day.incidents || []).forEach((incident) => {
      if (incident.overlap_start && incident.overlap_end) {
        const start = new Date(incident.overlap_start);
        const end = new Date(incident.overlap_end);
        if (!Number.isNaN(start) && !Number.isNaN(end) && end > start) {
          intervals.push([start, end]);
        }
      }
    });
  });
  
  // Extract from component.incidents array (from API)
  (component.incidents || []).forEach((incident) => {
    const impact = incident.impact || 'none';
    if (!countsAsDowntime(impact)) return;
    const interval = incidentInterval(incident);
    if (interval) {
      intervals.push(interval);
    }
  });
  
  return intervals;
};

const render = async () => {
  const resp = await fetch(DATA_URL);
  const data = await resp.json();

  const fetchedAt = data.fetched_at ? new Date(data.fetched_at) : new Date();
  const components = data.components || [];

  const now = new Date();
  const today = getDayStartUTC(now);
  const rangeStart = new Date(today);
  rangeStart.setUTCDate(rangeStart.getUTCDate() - 89);
  const rangeEnd = new Date(today);
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 1);

  // Build 90-day platform severity (worst status per day across all components)
  const platformDaySeverity = new Array(90).fill(0);
  const platformDayIncidents = Array.from({ length: 90 }, () => new Map());

  // Collect all platform-level incident intervals for uptime calculation
  const platformIntervals = [];

  components.forEach((component) => {
    const days = component.days || [];
    days.forEach((day, index) => {
      if (index >= 90) return;
      const impact = statusToImpact(day.status);
      const rank = impactRank[impact] ?? 0;
      platformDaySeverity[index] = Math.max(platformDaySeverity[index], rank);

      (day.incidents || []).forEach((incident) => {
        const id = incident.id || incident.name;
        if (!id) return;
        const existing = platformDayIncidents[index].get(id);
        const iv = incidentInterval(incident);
        if (!existing || rank > (impactRank[existing.impact] ?? 0)) {
          platformDayIncidents[index].set(id, {
            id,
            title: incident.name || id,
            impact,
            overlap_start: iv ? iv[0].toISOString() : incident.overlap_start,
            overlap_end: iv ? iv[1].toISOString() : incident.overlap_end,
            url: `https://status.nintex.com/incidents/${id}`,
          });
        }
        // Collect downtime intervals for platform uptime
        if (countsAsDowntime(impact) && iv) {
          platformIntervals.push(iv);
        }
      });
    });
    
    // Also process incidents from the component.incidents array (from API)
    (component.incidents || []).forEach((incident) => {
      const id = incident.id;
      if (!id) return;
      const impact = incident.impact || 'none';
      const iv = incidentInterval(incident);
      if (!iv) return;
      
      // Determine which day(s) this incident affects
      const dayStart = getDayStartUTC(iv[0]);
      const dayEnd = getDayStartUTC(new Date(iv[1].getTime() + 86400000)); // next day
      
      for (let d = new Date(dayStart); d < dayEnd; d.setUTCDate(d.getUTCDate() + 1)) {
        const barIndex = Math.round((d.getTime() - rangeStart.getTime()) / 86400000);
        if (barIndex < 0 || barIndex >= 90) continue;
        
        const rank = impactRank[impact] ?? 0;
        platformDaySeverity[barIndex] = Math.max(platformDaySeverity[barIndex], rank);
        
        const existing = platformDayIncidents[barIndex].get(id);
        if (!existing || rank > (impactRank[existing.impact] ?? 0)) {
          platformDayIncidents[barIndex].set(id, {
            id,
            title: incident.name || incident.title || id,
            impact,
            overlap_start: iv[0].toISOString(),
            overlap_end: iv[1].toISOString(),
            url: `https://status.nintex.com/incidents/${id}`,
          });
        }
      }
      
      // Collect downtime intervals for platform uptime
      if (countsAsDowntime(impact)) {
        platformIntervals.push(iv);
      }
    });
  });

  const mergedPlatform = mergeIntervals(platformIntervals);
  const downtimeMinutes = mergedPlatform.reduce((sum, [start, end]) => sum + minutesBetween(start, end), 0);
  const totalMinutes = 90 * 24 * 60;
  const uptime = Math.max(0, 1 - downtimeMinutes / totalMinutes);

  const uptimePercent = document.getElementById('uptimePercent');
  uptimePercent.textContent = `${(uptime * 100).toFixed(2)}% uptime`;

  const uptimeBars = document.getElementById('uptimeBars');
  const uptimeTooltip = document.getElementById('uptimeTooltip');
  const heroPanel = document.querySelector('.hero-panel');
  uptimeBars.innerHTML = '';
  uptimeTooltip.classList.remove('active');

  platformDaySeverity.forEach((severity, index) => {
    const span = document.createElement('span');
    const impact = Object.keys(impactRank).find((key) => impactRank[key] === severity) || 'none';
    span.className = impact === 'none' ? 'operational' : impact;
    span.dataset.dayIndex = String(index);
    span.tabIndex = 0;
    uptimeBars.appendChild(span);
  });

  const severityToImpact = (severity) =>
    Object.keys(impactRank).find((key) => impactRank[key] === severity) || 'none';

  const attachTooltip = (
    bars,
    tooltip,
    container,
    severityByDay,
    incidentsByDay,
    startDate,
    placement = 'auto',
  ) => {
    const state = tooltip._tooltipState || (tooltip._tooltipState = { hideTimeout: null });

    const positionTooltip = (target) => {
      const panelRect = container.getBoundingClientRect();
      const barRect = target.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const padding = 12;
      let left = barRect.left - panelRect.left + barRect.width / 2;
      left = Math.max(
        tooltipRect.width / 2 + padding,
        Math.min(left, panelRect.width - tooltipRect.width / 2 - padding),
      );
      let top = barRect.top - panelRect.top - tooltipRect.height - 12;
      if (placement === 'below') {
        top = barRect.bottom - panelRect.top + 12;
      } else if (top < padding) {
        top = barRect.bottom - panelRect.top + 12;
      }
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
      const tooltipLeft = left - tooltipRect.width / 2;
      const arrowLeft = barRect.left - panelRect.left + barRect.width / 2 - tooltipLeft;
      tooltip.style.setProperty('--arrow-left', `${arrowLeft}px`);
      tooltip.dataset.arrow = 'top';
    };

    const showTooltip = (target) => {
      if (state.hideTimeout) {
        window.clearTimeout(state.hideTimeout);
        state.hideTimeout = null;
      }
      container.classList.add('tooltip-open');
      const stackTarget = container.closest('section');
      if (stackTarget && stackTarget !== container) {
        stackTarget.classList.add('tooltip-open');
      }
      const index = Number(target.dataset.dayIndex || 0);
      const date = new Date(startDate.getTime() + index * 86400000);
      const dayStart = getDayStartUTC(date);
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const incidents = Array.from(incidentsByDay[index]?.values() || []);
      const severity = severityByDay[index] ?? 0;
      const impact = severityToImpact(severity);
      const downtimeIntervals = incidents
        .filter((item) => countsAsDowntime(item.impact))
        .map((item) => {
          if (!item.overlap_start || !item.overlap_end) return null;
          const start = new Date(item.overlap_start);
          const end = new Date(item.overlap_end);
          if (Number.isNaN(start) || Number.isNaN(end)) return null;
          return clipInterval(start, end, dayStart, dayEnd);
        })
        .filter(Boolean);
      const merged = mergeIntervals(downtimeIntervals);
      const downtimeMinutes = merged.reduce((sum, [start, end]) => sum + minutesBetween(start, end), 0);
      const duration = downtimeMinutes > 0 ? formatDuration(downtimeMinutes) : '';

      const incidentList = incidents.length
        ? `<ul class="tooltip-incidents">${incidents
            .slice(0, 4)
            .map((item) => {
              const title = item.title;
              if (item.url) {
                return `<li><a href="${item.url}" target="_blank" rel="noreferrer">${title}</a></li>`;
              }
              return `<li>${title}</li>`;
            })
            .join('')}</ul>`
        : '<p class="tooltip-incidents">No downtime recorded.</p>';

      tooltip.innerHTML = `
        <div class="tooltip-date">${formatDate(date)}</div>
        <div class="tooltip-summary">
          <span class="tooltip-dot ${impact}"></span>
          <span>${impactSummary[impact] || 'Operational'}</span>
          ${duration ? `<span class="tooltip-duration">${duration}</span>` : ''}
        </div>
        ${incidents.length ? '<div class="tooltip-related">Related</div>' : ''}
        ${incidentList}
      `;
      tooltip.classList.add('active');
      tooltip.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(() => positionTooltip(target));
    };

    const hideTooltip = () => {
      tooltip.classList.remove('active');
      tooltip.setAttribute('aria-hidden', 'true');
      container.classList.remove('tooltip-open');
      const stackTarget = container.closest('section');
      if (stackTarget && stackTarget !== container) {
        stackTarget.classList.remove('tooltip-open');
      }
    };

    const scheduleHide = () => {
      if (state.hideTimeout) window.clearTimeout(state.hideTimeout);
      state.hideTimeout = window.setTimeout(() => {
        hideTooltip();
      }, 120);
    };

    bars.querySelectorAll('span').forEach((bar) => {
      if (bar.dataset.dayIndex === undefined) return;
      bar.addEventListener('mouseenter', () => showTooltip(bar));
      bar.addEventListener('focus', () => showTooltip(bar));
      bar.addEventListener('mouseleave', scheduleHide);
      bar.addEventListener('blur', scheduleHide);
    });

    if (!tooltip.dataset.bound) {
      tooltip.addEventListener('mouseenter', () => {
        if (state.hideTimeout) window.clearTimeout(state.hideTimeout);
      });
      tooltip.addEventListener('mouseleave', scheduleHide);
      tooltip.dataset.bound = 'true';
    }
  };

  attachTooltip(uptimeBars, uptimeTooltip, heroPanel, platformDaySeverity, platformDayIncidents, rangeStart);

  // Count unique incidents in the last 90 days across all components
  const allIncidentIds = new Set();
  platformDayIncidents.forEach((dayMap) => {
    dayMap.forEach((_, id) => allIncidentIds.add(id));
  });
  const recentIncidentCount = allIncidentIds.size;

  renderStatusMeta(fetchedAt, recentIncidentCount);
  shareState.lastUpdated = fetchedAt;
  shareState.recentIncidentCount = recentIncidentCount;
  shareState.uptime = uptime;
  shareState.daySeverity = platformDaySeverity.slice();
  bindShareAction();
  scheduleSharePrime();

  // Service uptime section — one row per component
  const serviceStatus = document.getElementById('serviceStatus');
  serviceStatus.innerHTML = '';
  const servicePanel = serviceStatus.closest('.panel');
  const serviceTooltip = document.createElement('div');
  serviceTooltip.className = 'uptime-tooltip service-tooltip';
  serviceTooltip.setAttribute('aria-hidden', 'true');
  servicePanel.appendChild(serviceTooltip);

  components.forEach((component) => {
    const days = component.days || [];
    const daySeverity = new Array(90).fill(0);
    const dayIncidents = Array.from({ length: 90 }, () => new Map());
    const intervals = [];

    days.forEach((day, index) => {
      if (index >= 90) return;
      const impact = statusToImpact(day.status);
      const rank = impactRank[impact] ?? 0;
      daySeverity[index] = rank;

      (day.incidents || []).forEach((incident) => {
        const id = incident.id || incident.name;
        if (!id) return;
        const existing = dayIncidents[index].get(id);
        const iv = incidentInterval(incident);
        if (!existing || rank > (impactRank[existing.impact] ?? 0)) {
          dayIncidents[index].set(id, {
            id,
            title: incident.name || id,
            impact,
            overlap_start: iv ? iv[0].toISOString() : incident.overlap_start,
            overlap_end: iv ? iv[1].toISOString() : incident.overlap_end,
            url: `https://status.nintex.com/incidents/${id}`,
          });
        }
        if (countsAsDowntime(impact) && iv) {
          intervals.push(iv);
        }
      });
    });
    
    // Also process incidents from component.incidents array (from API)
    (component.incidents || []).forEach((incident) => {
      const id = incident.id;
      if (!id) return;
      const impact = incident.impact || 'none';
      const iv = incidentInterval(incident);
      if (!iv) return;
      
      // Determine which day(s) this incident affects
      const dayStart = getDayStartUTC(iv[0]);
      const dayEnd = getDayStartUTC(new Date(iv[1].getTime() + 86400000)); // next day
      
      for (let d = new Date(dayStart); d < dayEnd; d.setUTCDate(d.getUTCDate() + 1)) {
        const barIndex = Math.round((d.getTime() - rangeStart.getTime()) / 86400000);
        if (barIndex < 0 || barIndex >= 90) continue;
        
        const rank = impactRank[impact] ?? 0;
        daySeverity[barIndex] = Math.max(daySeverity[barIndex], rank);
        
        const existing = dayIncidents[barIndex].get(id);
        if (!existing || rank > (impactRank[existing.impact] ?? 0)) {
          dayIncidents[barIndex].set(id, {
            id,
            title: incident.name || incident.title || id,
            impact,
            overlap_start: iv[0].toISOString(),
            overlap_end: iv[1].toISOString(),
            url: `https://status.nintex.com/incidents/${id}`,
          });
        }
      }
      
      if (countsAsDowntime(impact)) {
        intervals.push(iv);
      }
    });

    const merged = mergeIntervals(intervals);
    const dtMinutes = merged.reduce((sum, [s, e]) => sum + minutesBetween(s, e), 0);
    const compUptime = Math.max(0, 1 - dtMinutes / totalMinutes);

    const row = document.createElement('div');
    row.className = 'service-row';

    const header = document.createElement('div');
    header.className = 'service-row-header';
    const name = document.createElement('strong');
    name.textContent = component.name;
    const uptimeValue = document.createElement('span');
    uptimeValue.textContent = `${(compUptime * 100).toFixed(2)}% uptime`;
    header.appendChild(name);
    header.appendChild(uptimeValue);
    row.appendChild(header);

    const bars = document.createElement('div');
    bars.className = 'service-bars';
    daySeverity.forEach((severity, index) => {
      const span = document.createElement('span');
      const impact = Object.keys(impactRank).find((key) => impactRank[key] === severity) || 'none';
      span.className = impact === 'none' ? 'operational' : impact;
      span.dataset.dayIndex = String(index);
      span.tabIndex = 0;
      bars.appendChild(span);
    });
    row.appendChild(bars);
    serviceStatus.appendChild(row);

    attachTooltip(bars, serviceTooltip, servicePanel, daySeverity, dayIncidents, rangeStart, 'below');
  });

  // Uptime history section
  const historyGrid = document.getElementById('historyGrid');
  const historyPrev = document.getElementById('historyPrev');
  const historyNext = document.getElementById('historyNext');
  const historyRange = document.getElementById('historyRange');

  // Build a flat list of all window entries for the history section
  const windowEntries = [];
  components.forEach((component) => {
    (component.days || []).forEach((day, index) => {
      const impact = statusToImpact(day.status);
      (day.incidents || []).forEach((incident) => {
        const id = incident.id || incident.name;
        const iv = incidentInterval(incident);
        if (!iv) return;
        const [start, end] = iv;
        windowEntries.push({
          id,
          title: incident.name || id,
          impact,
          start,
          end,
          url: `https://status.nintex.com/incidents/${id}`,
        });
      });
    });
  });

  // Deduplicate window entries by id (keep highest severity)
  const deduped = new Map();
  windowEntries.forEach((entry) => {
    const existing = deduped.get(entry.id);
    if (!existing || (impactRank[entry.impact] ?? 0) > (impactRank[existing.impact] ?? 0)) {
      deduped.set(entry.id, entry);
    }
  });
  const uniqueEntries = Array.from(deduped.values());

  // Determine date range from actual data
  const allDates = uniqueEntries.map((e) => e.start).filter((d) => !Number.isNaN(d));
  const earliest = allDates.reduce((min, d) => (d < min ? d : min), allDates[0] || rangeStart);
  const latest = allDates.reduce((max, d) => (d > max ? d : max), allDates[0] || rangeStart);

  const minMonth = monthStartUTC(earliest);
  const maxMonth = monthStartUTC(latest);
  const maxViewStart = addMonthsUTC(maxMonth, -2);

  let viewStart = addMonthsUTC(maxMonth, -2);
  if (viewStart < minMonth) {
    viewStart = minMonth;
  }

  const formatMonth = (date) =>
    new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);

  const buildMonthData = (monthStart) => {
    const monthEnd = addMonthsUTC(monthStart, 1);
    const dayCount = daysInMonthUTC(monthStart);
    const todayStart = getDayStartUTC(now);
    let activeDayCount = dayCount;
    if (todayStart < monthStart) {
      activeDayCount = 0;
    } else if (todayStart < monthEnd) {
      activeDayCount = Math.floor((todayStart.getTime() - monthStart.getTime()) / 86400000) + 1;
    }
    const activeRangeEnd = new Date(monthStart.getTime() + activeDayCount * 86400000);
    const daySeverity = new Array(dayCount).fill(0);
    const dayIncidents = Array.from({ length: dayCount }, () => new Map());
    const intervals = [];

    uniqueEntries.forEach((entry) => {
      const clipped = clipInterval(entry.start, entry.end, monthStart, monthEnd);
      if (!clipped) return;
      if (countsAsDowntime(entry.impact) && activeDayCount > 0) {
        const activeClip = clipInterval(entry.start, entry.end, monthStart, activeRangeEnd);
        if (activeClip) {
          intervals.push(activeClip);
        }
      }
      let current = dayStartUTC(clipped[0]);
      const lastDay = dayStartUTC(clipped[1]);
      while (current <= lastDay) {
        const index = (current - monthStart) / 86400000;
        if (index >= 0 && index < dayCount) {
          const impact = entry.impact || 'none';
          daySeverity[index] = Math.max(daySeverity[index], impactRank[impact] ?? 0);
          const existing = dayIncidents[index].get(entry.id);
          if (!existing || (impactRank[impact] ?? 0) > (impactRank[existing.impact] ?? 0)) {
            dayIncidents[index].set(entry.id, {
              id: entry.id,
              title: entry.title,
              impact,
              overlap_start: entry.start.toISOString(),
              overlap_end: entry.end.toISOString(),
              url: entry.url,
            });
          }
        }
        current = new Date(current.getTime() + 86400000);
      }
    });

    const mergedIntervals = mergeIntervals(intervals);
    const dtMinutes = mergedIntervals.reduce((sum, [s, e]) => sum + minutesBetween(s, e), 0);
    const totalMins = activeDayCount * 24 * 60;
    const uptime = totalMins > 0 ? Math.max(0, 1 - dtMinutes / totalMins) : null;

    return { dayCount, daySeverity, dayIncidents, uptime };
  };

  const renderHistory = () => {
    historyGrid.innerHTML = '';
    const months = [viewStart, addMonthsUTC(viewStart, 1), addMonthsUTC(viewStart, 2)];
    const lastMonth = months[2];
    historyRange.textContent = `${formatMonth(months[0])} to ${formatMonth(lastMonth)}`;

    months.forEach((monthStart) => {
      if (monthStart < minMonth || monthStart > maxMonth) {
        return;
      }
      const monthData = buildMonthData(monthStart);
      const card = document.createElement('div');
      card.className = 'month-card';

      const header = document.createElement('div');
      header.className = 'month-header';
      const title = document.createElement('strong');
      title.textContent = formatMonth(monthStart);
      const uptimeEl = document.createElement('span');
      uptimeEl.textContent = monthData.uptime === null ? '—' : `${(monthData.uptime * 100).toFixed(2)}%`;
      header.appendChild(title);
      header.appendChild(uptimeEl);
      card.appendChild(header);

      const grid = document.createElement('div');
      grid.className = 'month-grid';
      const pad = monthStart.getUTCDay();
      for (let i = 0; i < pad; i += 1) {
        const empty = document.createElement('span');
        empty.className = 'month-empty';
        grid.appendChild(empty);
      }

      for (let dayIndex = 0; dayIndex < monthData.dayCount; dayIndex += 1) {
        const dayDate = new Date(monthStart.getTime() + dayIndex * 86400000);
        const square = document.createElement('span');
        if (dayDate > today) {
          square.className = 'month-day future';
        } else {
          const severity = monthData.daySeverity[dayIndex];
          const impact = Object.keys(impactRank).find((key) => impactRank[key] === severity) || 'none';
          square.className = `month-day ${impact === 'none' ? 'operational' : impact}`;
          square.dataset.dayIndex = String(dayIndex);
          square.tabIndex = 0;
        }
        grid.appendChild(square);
      }

      card.appendChild(grid);

      const tooltip = document.createElement('div');
      tooltip.className = 'uptime-tooltip history-tooltip';
      tooltip.setAttribute('aria-hidden', 'true');
      card.appendChild(tooltip);

      attachTooltip(grid, tooltip, card, monthData.daySeverity, monthData.dayIncidents, monthStart);

      historyGrid.appendChild(card);
    });

    historyPrev.disabled = viewStart <= minMonth;
    historyNext.disabled = viewStart >= maxViewStart;
  };

  historyPrev.addEventListener('click', () => {
    if (viewStart <= minMonth) return;
    viewStart = addMonthsUTC(viewStart, -1);
    if (viewStart < minMonth) viewStart = minMonth;
    renderHistory();
  });

  historyNext.addEventListener('click', () => {
    if (viewStart >= maxViewStart) return;
    viewStart = addMonthsUTC(viewStart, 1);
    if (viewStart > maxViewStart) viewStart = maxViewStart;
    renderHistory();
  });

  renderHistory();

  // Incident timeline — deduplicated, sorted by date descending
  const allIncidents = [];
  const seenTimeline = new Set();
  components.forEach((component) => {
    (component.days || []).forEach((day) => {
      const impact = statusToImpact(day.status);
      (day.incidents || []).forEach((incident) => {
        const id = incident.id || incident.name;
        if (!id || seenTimeline.has(id)) return;
        seenTimeline.add(id);
        allIncidents.push({
          id,
          title: incident.name || id,
          impact,
          datetime_open: incident.datetime_open,
          duration: incident.duration,
          url: `https://status.nintex.com/incidents/${id}`,
        });
      });
    });
  });

  allIncidents.sort((a, b) => {
    const dateA = a.datetime_open ? new Date(a.datetime_open) : new Date(0);
    const dateB = b.datetime_open ? new Date(b.datetime_open) : new Date(0);
    return dateB - dateA;
  });

  const timeline = document.getElementById('incidentTimeline');
  timeline.innerHTML = '';

  const grouped = new Map();
  allIncidents.forEach((incident) => {
    const date = incident.datetime_open
      ? formatDate(new Date(incident.datetime_open))
      : 'Unknown date';
    if (!grouped.has(date)) grouped.set(date, []);
    grouped.get(date).push(incident);
  });

  const entries = Array.from(grouped.entries());
  let showAll = false;
  const toggleButtons = Array.from(document.querySelectorAll('[data-toggle-timeline]'));

  const renderTimeline = () => {
    timeline.innerHTML = '';
    const slice = showAll ? entries : entries.slice(0, 8);
    slice.forEach(([date, list]) => {
      const group = document.createElement('div');
      group.className = 'incident-group';

      const heading = document.createElement('h4');
      heading.textContent = date;
      group.appendChild(heading);

      list.forEach((incident) => {
        group.appendChild(renderIncidentCard(incident));
      });

      timeline.appendChild(group);
    });
  };

  renderTimeline();
  const updateToggleButtons = () => {
    toggleButtons.forEach((button) => {
      button.textContent = showAll ? 'Show fewer' : 'Show more';
    });
  };

  updateToggleButtons();

  toggleButtons.forEach((button) => {
    button.addEventListener('click', () => {
      showAll = !showAll;
      updateToggleButtons();
      renderTimeline();
    });
  });
};

const renderIncidentCard = (incident) => {
  const card = document.createElement('div');
  card.className = 'incident-card';

  const titleRow = document.createElement('div');
  titleRow.className = 'incident-title';

  const title = document.createElement('h5');
  const link = document.createElement('a');
  link.href = incident.url || '#';
  link.textContent = incident.title || 'Incident';
  link.target = '_blank';
  link.rel = 'noreferrer';
  title.appendChild(link);
  titleRow.appendChild(title);

  const badge = document.createElement('span');
  const impact = incident.impact || 'none';
  badge.className = `badge ${impact}`;
  badge.textContent = impactLabel[impact] || 'Operational';
  titleRow.appendChild(badge);

  card.appendChild(titleRow);

  const meta = document.createElement('div');
  meta.className = 'incident-meta';
  const openDate = incident.datetime_open ? new Date(incident.datetime_open) : null;
  const timeStr = openDate ? `${formatTime(openDate)} UTC` : '';
  const durationStr = incident.duration ? `${incident.duration} min impact` : '';
  meta.textContent = [timeStr, durationStr].filter(Boolean).join(' • ');
  card.appendChild(meta);

  return card;
};

render().catch((error) => {
  console.error(error);
  const status = document.getElementById('statusHeadline');
  if (status) status.textContent = 'Unable to load uptime data.';
});
