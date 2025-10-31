import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Reservation, Resource } from "../types/type";
import { formatDate, getTimeRange } from "../util/dateUtils";

interface UpcomingReservationsProps {
  userId: string | null;
  onReservationCancelled?: () => void;
  refreshTrigger?: number;
}

interface GroupedReservation {
  date: string;
  dateObject: Date;
  reservations: (Reservation & { resource?: Resource })[];
}

const UpcomingReservations = ({
  userId,
  onReservationCancelled,
  refreshTrigger,
}: UpcomingReservationsProps) => {
  const [groupedReservations, setGroupedReservations] = useState<
    GroupedReservation[]
  >([]);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchUpcomingReservations();
    }
  }, [userId, refreshTrigger]);

  const fetchUpcomingReservations = async () => {
    if (!userId) return;

    try {
      setLoading(true);
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
        console.error("Error fetching reservations:", reservationsError);
        return;
      }

      if (!reservations || reservations.length === 0) {
        setGroupedReservations([]);
        return;
      }

      console.log("Fetched reservations:", reservations);

      // Fetch resource details for each reservation
      const resourceIds = [
        ...new Set(reservations.map((r) => r.resourceId)),
      ];
      const { data: resources, error: resourcesError } = await supabase
        .from("resources")
        .select("*")
        .in("id", resourceIds);

      if (resourcesError) {
        console.error("Error fetching resources:", resourcesError);
        return;
      }

      // Create a map of resources for quick lookup
      const resourceMap = new Map(
        resources?.map((r) => [r.id, r]) || [],
      );

      // Group reservations by date
      const grouped: { [key: string]: GroupedReservation } = {};

      for (const reservation of reservations) {
        const dateStr = reservation.date.split("T")[0];
        if (!grouped[dateStr]) {
          grouped[dateStr] = {
            date: dateStr,
            dateObject: new Date(reservation.date),
            reservations: [],
          };
        }

        grouped[dateStr].reservations.push({
          ...reservation,
          resource: resourceMap.get(reservation.resourceId),
        });
      }

      // Convert to array and sort by date
      const sortedGroups = Object.values(grouped).sort(
        (a, b) => a.dateObject.getTime() - b.dateObject.getTime(),
      );

      setGroupedReservations(sortedGroups);
    } catch (error) {
      console.error("Error in fetchUpcomingReservations:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (date: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDays(newExpanded);
  };

  // Check if current date and time is within a reservation's timeframe
  const isWithinReservationTime = (reservation: Reservation): boolean => {
    const now = new Date();
    const reservationDate = new Date(reservation.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    reservationDate.setHours(0, 0, 0, 0);
    
    // Check if reservation is today
    if (reservationDate.getTime() !== today.getTime()) {
      return false;
    }

    // Parse timeslots
    const timeslots = Array.isArray(reservation.timeslots)
      ? reservation.timeslots
      : [];
    
    if (timeslots.length === 0) return false;

    // Get current time in HHMM format
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMinute = now.getMinutes().toString().padStart(2, '0');
    const currentTime = parseInt(`${currentHour}${currentMinute}`);

    // Check if current time falls within any timeslot
    for (const slot of timeslots) {
      const [start, end] = slot.split('-');
      const startTime = parseInt(start.replace(':', ''));
      const endTime = parseInt(end.replace(':', ''));

      if (currentTime >= startTime && currentTime <= endTime) {
        return true;
      }
    }

    return false;
  };

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleCheckIn = async (reservationId: string) => {
    // Target location coordinates (replace with actual building coordinates)
    const targetLat = import.meta.env.VITE_TARGET_LATITUDE;
    const targetLon = import.meta.env.VITE_TARGET_LONGITUDE;
    const maxDistance = import.meta.env.VITE_PROXIMITY_THRESHOLD_METERS / 1000;

    try {
      // Request user's location
      if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const userLat = position.coords.latitude;
          const userLon = position.coords.longitude;
          console.log("User coordinates:", userLat, userLon);

          // Calculate distance
          const distance = calculateDistance(userLat, userLon, targetLat, targetLon);

          if (distance > maxDistance) {
            alert(
              `You are too far from the location. You are ${distance.toFixed(2)} km away. Please be within 1 km to check in.`
            );
            return;
          }

          // Update reservation status to "Completed"
          const { error } = await supabase
            .from("reservations")
            .update({ status: "Completed" })
            .eq("id", reservationId);

          if (error) {
            console.error("Error checking in:", error);
            alert("Failed to check in. Please try again.");
            return;
          }

          alert("Successfully checked in!");
          
          // Refresh the reservations list
          await fetchUpcomingReservations();
        },
        (error) => {
          console.error("Error getting location:", error);
          alert(
            "Failed to get your location. Please enable location services and try again."
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } catch (error) {
      console.error("Error in handleCheckIn:", error);
      alert("An error occurred during check-in.");
    }
  };

  const handleCancelReservation = async (reservationId: string) => {
    if (!window.confirm("Are you sure you want to cancel this reservation?")) {
      return;
    }

    try {
      // Delete the reservation
      const { error: reservationUpdateError } = await supabase
        .from("reservations")
        .delete()
        .eq("id", reservationId)
        .select();

      if (reservationUpdateError) {
        console.error("Error cancelling reservation:", reservationUpdateError);
        alert("Failed to cancel reservation. Please try again.");
        return;
      }

      const { data: affectedUser, error: fetchUserError } = await supabase
        .from("users")
        .select("reservations")
        .eq("id", userId)
        .single();

      if (fetchUserError) {
        console.error("Error fetching user reservations:", fetchUserError);
        alert("Failed to fetch user reservations. Please try again.");
        return;
      }
      const currentReservations: string[] = affectedUser?.reservations || [];

      const updatedReservations = currentReservations.filter(
        (id) => id !== reservationId
      );

      const { error: userUpdateError } = await supabase
        .from("users")
        .update({
          reservations: updatedReservations,
        })
        .eq("id", userId);

      if (userUpdateError) {
        console.error("Error updating user reservations:", userUpdateError);
        alert("Failed to update user reservations. Please try again.");
        return;
      }

      alert("Reservation cancelled successfully!");

      // Refresh the reservations list
      await fetchUpcomingReservations();

      // Notify parent component if callback provided
      if (onReservationCancelled) {
        onReservationCancelled();
      }
    } catch (error) {
      console.error("Error in handleCancelReservation:", error);
      alert("An error occurred while cancelling the reservation.");
    }
  };

  if (loading) {
    return (
      <div className="mb-8 p-4 sm:p-6 bg-white rounded-xl shadow-md">
        <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Upcoming Reservations</h2>
        <p className="text-sm sm:text-base text-gray-600">Loading...</p>
      </div>
    );
  }

  if (groupedReservations.length === 0) {
    return (
      <div className="mb-8 p-4 sm:p-6 bg-white rounded-xl shadow-md">
        <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Upcoming Reservations</h2>
        <p className="text-sm sm:text-base text-gray-600">No upcoming reservations.</p>
      </div>
    );
  }

  return (
    <div className="mb-8 p-4 sm:p-6 bg-white rounded-xl shadow-md">
      <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Upcoming Reservations</h2>
      <div className="space-y-2 sm:space-y-3">
        {groupedReservations.map((group) => (
          <div
            key={group.date}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            {/* Day Header */}
            <button
              type="button"
              onClick={() => toggleDay(group.date)}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 hover:bg-gray-100 text-left flex justify-between items-center transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                <span className="font-semibold text-base sm:text-lg">
                  {formatDate(group.dateObject)}
                </span>
                <span className="text-xs sm:text-sm text-gray-600 sm:ml-3">
                  ({group.reservations.length}{" "}
                  {group.reservations.length === 1 ? "reservation" : "reservations"})
                </span>
              </div>
              <svg
                className={`w-4 h-4 sm:w-5 sm:h-5 transform transition-transform flex-shrink-0 ${expandedDays.has(group.date) ? "rotate-180" : ""
                  }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Reservation Details */}
            {expandedDays.has(group.date) && (
              <div className="p-3 space-y-2">
                {group.reservations.map((reservation) => {
                  const timeslots = Array.isArray(reservation.timeslots)
                    ? reservation.timeslots
                    : [];
                  const timeRange = getTimeRange(timeslots);
                  const canCheckIn = isWithinReservationTime(reservation) && reservation.status === "Reserved";

                  return (
                    <div
                      key={reservation.id}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                    >
                      <div className="flex justify-between md:gap-8">
                        <div className="flex items-center gap-2 ">
                          <h3 className="font-semibold text-base truncate">
                            {reservation.resource?.name || "Unknown Resource"}
                          </h3>
                          {reservation.status === "Completed" && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                              Checked-in
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <svg
                            className="w-4 h-4 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span className="font-medium">{timeRange}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 self-start sm:self-center">
                        {canCheckIn && (
                          <button
                            type="button"
                            onClick={() => handleCheckIn(reservation.id)}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium whitespace-nowrap"
                          >
                            Check-in
                          </button>
                        )}
                        {reservation.status !== "Completed" && (
                          <button
                            type="button"
                            onClick={() => handleCancelReservation(reservation.id)}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium whitespace-nowrap"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default UpcomingReservations;
