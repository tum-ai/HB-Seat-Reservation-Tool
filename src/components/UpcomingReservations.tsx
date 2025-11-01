import { useCallback, useEffect, useState } from "react";
import type { Reservation, Resource } from "../types/type";
import { formatDate } from "../util/dateUtils";
import {
  cancelReservation,
  checkInReservation,
  fetchUserReservations,
} from "../util/reservationUtils";
import { fetchResourcesByIds } from "../util/resourceUtils";
import ReservationCard from "./ReservationCard";

interface UpcomingReservationsProps {
  userId: string | null;
  refreshTrigger?: number;
  onReservationCancelled?: () => void;
}

interface GroupedReservation {
  date: string;
  dateObject: Date;
  reservations: (Reservation & { resource?: Resource })[];
}

const UpcomingReservations = ({
  userId,
  refreshTrigger,
  onReservationCancelled,
}: UpcomingReservationsProps) => {
  const [groupedReservations, setGroupedReservations] = useState<
    GroupedReservation[]
  >([]);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchUpcomingReservations = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);

      // Fetch reservations for the user
      const reservations = await fetchUserReservations(userId);

      if (!reservations || reservations.length === 0) {
        setGroupedReservations([]);
        return;
      }

      // Fetch resource details for each reservation
      const resourceIds = [...new Set(reservations.map((r) => r.resourceId))];
      const resources = await fetchResourcesByIds(resourceIds);

      // Create a map of resources for quick lookup
      const resourceMap = new Map(resources?.map((r) => [r.id, r]) || []);

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
        (a, b) => a.dateObject.getTime() - b.dateObject.getTime()
      );

      setGroupedReservations(sortedGroups);
    } catch (error) {
      console.error("Error in fetchUpcomingReservations:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]); // Add userId to the dependency array of useCallback

  useEffect(() => {
    if (userId) {
      fetchUpcomingReservations();
    }
  }, [userId, fetchUpcomingReservations, refreshTrigger]);

  const toggleDay = (date: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDays(newExpanded);
  };

  const getReservationStatus = (
    reservation: Reservation
  ): "expired" | "active" | "upcoming" => {
    const now = new Date();
    const reservationDate = new Date(reservation.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    reservationDate.setHours(0, 0, 0, 0);

    // If reservation is in the future, it's upcoming
    if (reservationDate.getTime() > today.getTime()) {
      return "upcoming";
    }

    // If reservation is in the past, it's expired
    if (reservationDate.getTime() < today.getTime()) {
      return "expired";
    }

    // Reservation is today - check timeslots
    const timeslots = Array.isArray(reservation.timeslots)
      ? reservation.timeslots.sort()
      : [];

    if (timeslots.length === 0) return "expired";

    const firstSlot = timeslots[0];
    const [start] = firstSlot.split("-");
    const [startHour, startMinute] = start.split(":").map(Number);

    const reservationStartTime = new Date(reservation.date);
    reservationStartTime.setHours(startHour, startMinute, 0, 0);

    const checkinWindowStart = new Date(
      reservationStartTime.getTime() - 5 * 60 * 1000
    );

    const checkinWindowEnd = new Date(
      reservationStartTime.getTime() + 15 * 60 * 1000
    );

    if (now >= checkinWindowStart && now <= checkinWindowEnd) {
      return "active"; // This is the check-in window
    }

    // Check if we are past the check-in window
    if (now > checkinWindowEnd) {
      return "expired";
    }

    // Otherwise, it's upcoming for today
    return "upcoming";
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
    const reservation = groupedReservations
      .flatMap((g) => g.reservations)
      .find((r) => r.id === reservationId);

    if (!reservation) {
      alert("Reservation not found.");
      return;
    }

    const timeslots = Array.isArray(reservation.timeslots)
      ? reservation.timeslots.sort()
      : [];

    if (timeslots.length === 0) {
      alert("Invalid reservation: no timeslots found.");
      return;
    }

    const firstSlot = timeslots[0];
    const [start] = firstSlot.split("-");
    const [startHour, startMinute] = start.split(":").map(Number);

    const reservationStartTime = new Date(reservation.date);
    reservationStartTime.setHours(startHour, startMinute, 0, 0);

    const checkinWindowEnd = new Date(
      reservationStartTime.getTime() + 15 * 60 * 1000
    );
    const now = new Date();

    if (now < reservationStartTime || now > checkinWindowEnd) {
      alert(
        "You can only check in within 15 minutes of the start of your reservation."
      );
      fetchUpcomingReservations();
      return;
    }

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

          // Calculate distance
          const distance = calculateDistance(
            userLat,
            userLon,
            targetLat,
            targetLon
          );

          if (distance > maxDistance) {
            alert(
              `You are too far from the location. You are ${distance.toFixed(
                2
              )} km away. Please be within 1 km to check in.`
            );
            return;
          }

          try {
            // Update reservation status to "Completed"
            await checkInReservation(reservationId);
            alert("Successfully checked in!");

            // Refresh the reservations list
            await fetchUpcomingReservations();
          } catch (error) {
            console.error("Error checking in:", error);
            alert("Failed to check in. Please try again.");
          }
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

  useEffect(() => {
    const interval = setInterval(() => {
      groupedReservations.forEach((group) => {
        group.reservations.forEach(async (reservation) => {
          if (reservation.status === "Reserved") {
            const timeslots = Array.isArray(reservation.timeslots)
              ? reservation.timeslots.sort()
              : [];

            if (timeslots.length > 0) {
              const firstSlot = timeslots[0];
              const [start] = firstSlot.split("-");
              const [startHour, startMinute] = start.split(":").map(Number);

              const reservationStartTime = new Date(reservation.date);
              reservationStartTime.setHours(startHour, startMinute, 0, 0);

              const checkinWindowEnd = new Date(
                reservationStartTime.getTime() + 15 * 60 * 1000
              );
              const now = new Date();

              if (now > checkinWindowEnd) {
                // Missed check-in, so cancel the reservation
                try {
                  if (!userId) return;
                  await cancelReservation(reservation.id);
                  console.log(
                    `Reservation ${reservation.id} automatically cancelled.`
                  );
                  fetchUpcomingReservations(); // Refresh the list
                } catch (error) {
                  console.error(
                    `Failed to auto-cancel reservation ${reservation.id}:`,
                    error
                  );
                }
              }
            }
          }
        });
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [groupedReservations, userId, fetchUpcomingReservations]);

  const handleCancelReservation = async (reservationId: string) => {
    if (!window.confirm("Are you sure you want to cancel this reservation?")) {
      return;
    }

    if (!userId) {
      alert("User ID is missing.");
      return;
    }

    try {
      await cancelReservation(reservationId);
      alert("Reservation cancelled successfully!");

      // Refresh the reservations list
      await fetchUpcomingReservations();

      // Notify parent component if callback provided
      if (onReservationCancelled) {
        onReservationCancelled();
      }
    } catch (error) {
      console.error("Error in handleCancelReservation:", error);
      alert("Failed to cancel reservation. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="mb-8 p-4 sm:p-6 bg-white rounded-xl shadow-md">
        <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">
          Upcoming Reservations
        </h2>
        <p className="text-sm sm:text-base text-gray-600">Loading...</p>
      </div>
    );
  }

  if (groupedReservations.length === 0) {
    return (
      <div className="mb-8 p-4 sm:p-6 bg-white rounded-xl shadow-md">
        <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">
          Upcoming Reservations
        </h2>
        <p className="text-sm sm:text-base text-gray-600">
          No upcoming reservations.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-8 p-4 sm:p-6 bg-white rounded-xl shadow-md">
      <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">
        Upcoming Reservations
      </h2>
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
                  {group.reservations.length === 1
                    ? "reservation"
                    : "reservations"}
                  )
                </span>
              </div>
              <svg
                className={`w-4 h-4 sm:w-5 sm:h-5 transform transition-transform flex-shrink-0 ${
                  expandedDays.has(group.date) ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Toggle visibility</title>
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
                  const status = getReservationStatus(reservation);
                  const canCheckIn =
                    status === "active" && reservation.status === "Reserved";
                  const isExpired =
                    status === "expired" && reservation.status === "Reserved";

                  return (
                    <ReservationCard
                      key={reservation.id}
                      reservation={reservation}
                      canCheckIn={canCheckIn}
                      isExpired={isExpired}
                      onCheckIn={handleCheckIn}
                      onCancel={handleCancelReservation}
                    />
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
