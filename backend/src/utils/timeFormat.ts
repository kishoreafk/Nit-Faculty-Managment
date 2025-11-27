export const formatTimeTo12Hour = (time: string): string => {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');
  return `${displayHours}:${displayMinutes} ${ampm}`;
};

export const formatRowTimes = (row: any): any => {
  if (row.start_time) {
    row.start_time_formatted = formatTimeTo12Hour(row.start_time);
  }
  if (row.end_time) {
    row.end_time_formatted = formatTimeTo12Hour(row.end_time);
  }
  return row;
};
