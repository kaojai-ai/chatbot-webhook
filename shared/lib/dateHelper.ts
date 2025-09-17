
const clampText = (text: string, maxLength: number): string => (text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text);

const formatDateTitle = (dateStr: string): string => {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return dateStr;
  }
  return date.toLocaleDateString('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
};

const formatDateForAction = (dateStr: string): string => {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return dateStr;
  }
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};


export {
    clampText,
    formatDateTitle,
    formatDateForAction,
}
