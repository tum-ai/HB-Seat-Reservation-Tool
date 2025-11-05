import { supabase } from "../lib/supabase";

export const createReservation = async (
  deskId: string,
  userId: string,
  date: string,
  timeslots: string[]
) => {
  const { data, error } = await supabase.rpc("create_reservation", {
    _resource_id: deskId,
    _user_id: userId,
    _date: new Date(date).toISOString(),
    _timeslots: timeslots,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
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

export const checkUserReservationConflict = async (
  userId: string,
  date: string,
  timeslots: string[]
) => {
  // Get the start of the selected day
  const selectedDate = new Date(date);
  selectedDate.setHours(0, 0, 0, 0);

  // Get the end of the selected day
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Fetch all active reservations for the user on the selected date
  const { data: userReservations, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("userId", userId)
    .neq("status", "Cancelled")
    .gte("date", selectedDate.toISOString())
    .lte("date", endOfDay.toISOString());

  if (error) {
    throw new Error(error.message);
  }

  if (!userReservations || userReservations.length === 0) {
    return null; // No conflict
  }

  // Check if any of the user's reservations overlap with the selected timeslots
  for (const reservation of userReservations) {
    const reservedTimeslots =
      typeof reservation.timeslots === "string"
        ? JSON.parse(reservation.timeslots)
        : reservation.timeslots;

    // Check if there's any overlap between selected and reserved timeslots
    const hasOverlap = timeslots.some((timeslot) =>
      Array.isArray(reservedTimeslots)
        ? reservedTimeslots.includes(timeslot)
        : false
    );

    if (hasOverlap) {
      return reservation; // Return the conflicting reservation
    }
  }

  return null; // No conflict
};
