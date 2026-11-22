// Deterministic color generation for user avatars based on username
const AVATAR_PALETTE = [
  'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', // Indigo
  'linear-gradient(135deg, #10b981 0%, #059669 100%)', // Emerald
  'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', // Amber
  'linear-gradient(135deg, #ec4899 0%, #db2777 100%)', // Pink
  'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', // Purple
  'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', // Cyan
  'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', // Orange
  'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)', // Teal
  'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', // Blue
  'linear-gradient(135deg, #e11d48 0%, #be123c 100%)', // Rose
];

export function getAvatarGradient(name: string): string {
  if (!name) return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
}

export function getInitials(name: string): string {
  if (!name) return '?';
  const clean = name.trim();
  if (clean.length <= 2) return clean.toUpperCase();
  const parts = clean.split(/[._\s-]+/);
  if (parts.length > 1 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

export function formatMessageTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  if (isToday) {
    return timeStr;
  }

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${day}.${month} ${timeStr}`;
}

export function formatDateSeparator(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) return 'Сегодня';

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return 'Вчера';

  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}
