import React from 'react';
import { format, isToday, isYesterday, isThisYear } from 'date-fns';

interface DateSeparatorProps {
  date: Date;
}

const DateSeparator: React.FC<DateSeparatorProps> = ({ date }) => {
  const formatDate = (date: Date): string => {
    if (isToday(date)) {
      return 'Today';
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else if (isThisYear(date)) {
      return format(date, 'EEEE, MMMM d'); // e.g., "Monday, January 15"
    } else {
      return format(date, 'EEEE, MMMM d, yyyy'); // e.g., "Monday, January 15, 2023"
    }
  };

  return (
    <div className="date-separator">
      <div className="date-separator-line"></div>
      <div className="date-separator-text">{formatDate(date)}</div>
      <div className="date-separator-line"></div>
    </div>
  );
};

export default DateSeparator;
