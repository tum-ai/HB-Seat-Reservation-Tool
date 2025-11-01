export type User = {
  id: string;
  name?: string;
  email: string;
  belongsToTeam: string[];
  reservations: string[];
  created_at: string;
};

export type Team = {
  id: string;
  users: string[]; // Array of User IDs
  headCount: number;
  reservations: string[]; // Array of Reservation IDs
};

export type Resource = {
  id: string;
  name: string;
  type: "Desk" | "Room";
  capacityLimit: number;
  availability: JSON;
  capacity: number;
  reservations: string[]; // Array of Reservation IDs
  subResources: string[]; // Array of Resource IDs
};

export type Reservation = {
  id: string;
  userId: string;
  resourceId: string;
  date: string; 
  timeslots: JSON;
  status: "Reserved" | "Cancelled" | "Completed";
};

export type Availability = {
  [weekday: string]: string[]; // e.g., { "monday": ["0800-0830", "0830-0900", "0900-0930", ..., "2330-2400"] }
};
