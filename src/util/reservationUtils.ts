// src/util/reservationUtils.ts
import { supabase } from "../lib/supabase";
import type { Availability, Resource } from "../types/type";
import { unformatTimeslot, weekdayNames } from "./dateUtils";

export const updateResourceAvailability = async (
  desk: Resource,
  date: string,
  timeslot: string
) => {
  const currentAvailability: Availability =
    typeof desk.availability === "string"
      ? JSON.parse(desk.availability)
      : (desk.availability as unknown as Availability);

  const dateObj = new Date(date);
  const weekdayName = weekdayNames[dateObj.getDay()];

  const unformattedSlot = unformatTimeslot(timeslot);
  const updatedDailyAvailability = (
    currentAvailability[weekdayName] || []
  ).filter((slot) => slot !== unformattedSlot);

  const updatedAvailability = {
    ...currentAvailability,
    [weekdayName]: updatedDailyAvailability,
  };

  const { error } = await supabase
    .from("resources")
    .update({ availability: JSON.stringify(updatedAvailability) })
    .eq("id", desk.id);

  if (error) {
    throw new Error(error.message);
  }
};

export const createReservation = async (
  deskId: string,
  userId: string,
  date: string,
  timeslot: string
) => {
  const { error } = await supabase.from("reservations").insert([
    {
      resourceId: deskId,
      userId: userId,
      date: new Date(date).toISOString(),
      timeslots: [timeslot],
    },
  ]);
  if (error) {
    throw new Error(error.message);
  }

  // Upsert the user record with the reservation (use a proper object literal)

  // fetch the user's current reservations
  const { data: userData, error: fetchError } = await supabase
    .from("users")
    .select("reservations")
    .eq("id", userId)
    .single();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const existingReservations: string[] =
    (userData?.reservations as string[]) ?? [];

  const { error: upsertError } = await supabase
    .from("users")
    .upsert({
      id: userId,
      reservations: [...existingReservations, date + " " + timeslot],
    })
    .select();

  if (upsertError) {
    throw new Error(upsertError.message);
  }
};

export const revertAvailability = async (
  deskId: string,
  originalAvailability: JSON | null
) => {
  const { error } = await supabase
    .from("resources")
    .update({ availability: originalAvailability })
    .eq("id", deskId);

  if (error) {
    alert(
      `CRITICAL: Failed to revert availability change for resource ${deskId}. Please check resource availability manually. Error: ${error.message}`
    );
  }
};
