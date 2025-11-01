// src/util/reservationUtils.ts
import { supabase } from "../lib/supabase";
import type { Availability, Resource } from "../types/type";
import { unformatTimeslot, weekdayNames } from "./dateUtils";

export const updateResourceAvailability = async (
  desk: Resource,
  date: string,
  timeslot: string,
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
  timeslots: string[],
) => {
  const { error } = await supabase
    .from("reservations")
    .insert([
      {
        resourceId: deskId,
        userId: userId,
        date: new Date(date).toISOString(),
        timeslots: timeslots,
      },
    ])
    .select();
  if (error) {
    throw new Error(error.message);
  }
};

export const revertAvailability = async (
  deskId: string,
  originalAvailability: JSON | null,
) => {
  const { error } = await supabase
    .from("resources")
    .update({ availability: originalAvailability })
    .eq("id", deskId);

  if (error) {
    alert(
      `CRITICAL: Failed to revert availability change for resource ${deskId}. Please check resource availability manually. Error: ${error.message}`,
    );
  }
};

export const getFutureReservationsForDesk = async (deskId: string) => {
  // Get today's date at midnight to include today's reservations
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("reservations")
    .select()
    .eq("resourceId", deskId)
    .gte("date", today.toISOString());

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const fetchUserReservations = async (userId: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fetch reservations for the user
  const { data: reservations, error: reservationsError } = await supabase
    .from("reservations")
    .select("*")
    .eq("userId", userId)
    .neq("status", "Cancelled")
    .gte("date", today.toISOString())
    .order("date", { ascending: true });

  if (reservationsError) {
    throw new Error(reservationsError.message);
  }

  return reservations || [];
};

export const checkInReservation = async (reservationId: string) => {
  const { error } = await supabase
    .from("reservations")
    .update({ status: "Completed" })
    .eq("id", reservationId);

  if (error) {
    throw new Error(error.message);
  }
};

export const cancelReservation = async (reservationId: string) => {
  // Delete the reservation
  const { error: reservationDeleteError } = await supabase
    .from("reservations")
    .delete()
    .eq("id", reservationId);

  if (reservationDeleteError) {
    throw new Error(reservationDeleteError.message);
  }
};
