import { format, parseISO, isValid } from 'date-fns';

export const formatDate = (isoString?: string): string => {
  if (!isoString) return '';
  const date = parseISO(isoString);
  return isValid(date) ? format(date, 'MMM d, yyyy') : '';
};

export const formatDateTime = (isoString?: string): string => {
  if (!isoString) return '';
  const date = parseISO(isoString);
  return isValid(date) ? format(date, 'MMM d, yyyy h:mm a') : '';
};

export const toLocalDateISOString = (dateInput?: string): string => {
  if (!dateInput) {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())).toISOString();
  }

  const [year, month, day] = dateInput.split('-').map(Number);
  if (!year || !month || !day) {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) {
      const now = new Date();
      return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())).toISOString();
    }
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString();
  }

  return new Date(Date.UTC(year, month - 1, day)).toISOString();
};
