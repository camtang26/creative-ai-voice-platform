import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPhoneNumber(phoneNumberString: string | null | undefined): string {
  if (!phoneNumberString) {
    return "N/A";
  }
  const cleaned = ('' + phoneNumberString).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{1,3}|)?(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    const intlCode = (match[1] ? `+${match[1]} ` : '');
    return [intlCode, '(', match[2], ') ', match[3], '-', match[4]].join('');
  }
  return phoneNumberString;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) {
    return "00:00";
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const hStr = h > 0 ? `${h}:` : "";
  const mStr = m < 10 ? `0${m}` : `${m}`;
  const sStr = s < 10 ? `0${s}` : `${s}`;
  return `${hStr}${mStr}:${sStr}`;
}

// Alias for formatDuration as formatTimeInSeconds might be used interchangeably
export const formatTimeInSeconds = formatDuration;

export function formatDate(dateString: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!dateString) {
    return "N/A";
  }
  try {
    const date = new Date(dateString);
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', // second: '2-digit',
      hour12: true,
    };
    return new Intl.DateTimeFormat('en-US', options || defaultOptions).format(date);
  } catch (e) {
    return "Invalid Date";
  }
}

export function formatPercentage(value: number | null | undefined, total: number | null | undefined): string {
  if (value === null || value === undefined || total === null || total === undefined || total === 0) {
    return "0%";
  }
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(1)}%`;
}
