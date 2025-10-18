// src/util/dateUtils.ts

export const weekdayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

// Generate dates from today to same day next week
export const generateDates = () => {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 8; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date);
  }
  return dates;
};

// Format date for display
export const formatDate = (date: Date) => {
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${weekdays[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
};

// Get ISO date string for comparison
export const getISODate = (date: Date) => {
  return date.toISOString().split('T')[0];
};

// Helper function to format time from "0800" to "08:00"
export const formatTime = (timeStr: string): string => {
  if (timeStr.length === 4) {
    return `${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)}`;
  }
  return timeStr;
};

// Helper function to format timeslot from "0800-0830" to "08:00-08:30"
export const formatTimeslot = (slot: string): string => {
  const [start, end] = slot.split('-');
  return `${formatTime(start)}-${formatTime(end)}`;
};

// Helper function to unformat timeslot from "08:00-08:30" to "0800-0830"
export const unformatTimeslot = (slot: string): string => {
    return slot.replace(/:/g, "");
}
