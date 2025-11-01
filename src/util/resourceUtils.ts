import { supabase } from "../lib/supabase";
import type { Availability, Resource } from "../types/type";
import { formatTimeslot, weekdayNames } from "./dateUtils";

// Get desks for selected room
export const getDesksForRoom = (
  room: Resource,
  resources: Resource[],
): Resource[] => {
  if (!room.subResources || room.subResources.length === 0) {
    return [];
  }
  const desks = resources.filter(
    (resource) =>
      resource.type === "Desk" && room.subResources.includes(resource.id),
  );
  return desks.sort((a, b) => a.name.localeCompare(b.name));
};

// Get availability timeslots for a desk on a specific date
export const getAvailableTimeslots = (
  desk: Resource,
  date: string,
): string[] => {
  if (!desk.availability) {
    return [];
  }

  try {
    const availability: Availability =
      typeof desk.availability === "string"
        ? JSON.parse(desk.availability)
        : (desk.availability as unknown as Availability);

    const dateObj = new Date(date);
    const weekdayName = weekdayNames[dateObj.getDay()];

    let timeslots = availability[weekdayName] || [];

    const today = new Date();
    const isToday = dateObj.toDateString() === today.toDateString();

    if (isToday) {
      // Get current time in *total minutes from midnight*
      // e.g., 9:30 AM becomes (9 * 60) + 30 = 570
      const currentMinutes = today.getHours() * 60 + today.getMinutes();

      timeslots = timeslots.filter((slot) => {
        // Get slot start time in *total minutes from midnight*
        const endTimeString = slot.split("-")[1]; // e.g., "0930"
        const endHours = parseInt(endTimeString.substring(0, 2), 10);
        const endMinutes = parseInt(endTimeString.substring(2, 4), 10);
        const endTimeInMinutes = endHours * 60 + endMinutes;

        // include slot only if it ends more than 15 minutes from now
        // so that user can still check in
        return endTimeInMinutes - 15 >= currentMinutes;
      });
    }

    return timeslots.map(formatTimeslot);
  } catch (error) {
    console.error("Error parsing availability:", error);
    return [];
  }
};

// Fetch resources by their IDs
export const fetchResourcesByIds = async (
  resourceIds: string[],
): Promise<Resource[]> => {
  const { data: resources, error } = await supabase
    .from("resources")
    .select("*")
    .in("id", resourceIds);

  if (error) {
    throw new Error(error.message);
  }

  return resources || [];
};
