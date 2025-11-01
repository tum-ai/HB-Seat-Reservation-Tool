import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import type { Reservation, Resource } from "../types/type";
import { formatDate, generateDates, getISODate } from "../util/dateUtils";
import {
  createReservation,
  getFutureReservationsForDesk,
} from "../util/reservationUtils";
import { getAvailableTimeslots, getDesksForRoom } from "../util/resourceUtils";
import ListEntry from "./ListEntry";

interface ReservationFlowProps {
  resources: Resource[];
  onReservationCreated?: () => void;
}

const ReservationFlow = ({
  resources,
  onReservationCreated,
}: ReservationFlowProps) => {
  const { user } = useAuth();
  // State management for selections
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTimeslots, setSelectedTimeslots] = useState<string[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Resource | null>(null);
  const [selectedDesk, setSelectedDesk] = useState<Resource | null>(null);
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);

  const dates = generateDates();

  // Filter rooms (resources with type "Room")
  const rooms = resources.filter((resource) => resource.type === "Room");

  // Fetch all reservations when date is selected to filter available resources
  useEffect(() => {
    const fetchAllReservations = async () => {
      if (selectedDate) {
        try {
          // Fetch reservations for all desks for the selected date
          const allDesks = resources.filter((r) => r.type === "Desk");
          const reservationPromises = allDesks.map((desk) =>
            getFutureReservationsForDesk(desk.id)
          );
          const allReservationsData = await Promise.all(reservationPromises);
          const flattenedReservations = allReservationsData.flat();
          setAllReservations(flattenedReservations);
        } catch (error) {
          console.error("Error fetching reservations:", error);
          setAllReservations([]);
        }
      } else {
        setAllReservations([]);
      }
    };

    fetchAllReservations();
  }, [selectedDate, resources]);

  const handleDateClick = (date: Date) => {
    if (selectedDate && selectedDate === getISODate(date)) {
      setSelectedDate(null);
      setSelectedTimeslots([]);
      setSelectedRoom(null);
      setSelectedDesk(null);
      return;
    }
    setSelectedDate(getISODate(date));
    setSelectedTimeslots([]);
    setSelectedRoom(null);
    setSelectedDesk(null);
  };

  const handleTimeslotClick = (timeslot: string) => {
    const areTimeslotsConsecutive = (timeslots: string[]): boolean => {
      if (timeslots.length <= 1) {
        return true;
      }

      const sortedTimeslots = [...timeslots].sort();

      for (let i = 0; i < sortedTimeslots.length - 1; i++) {
        const currentSlot = sortedTimeslots[i];
        const nextSlot = sortedTimeslots[i + 1];

        const currentEnd = currentSlot.split("-")[1];
        const nextStart = nextSlot.split("-")[0];

        if (currentEnd !== nextStart) {
          return false;
        }
      }

      return true;
    };

    if (selectedTimeslots.includes(timeslot)) {
      // Remove the timeslot if already selected
      const newTimeslots = selectedTimeslots.filter((t) => t !== timeslot);
      if (!areTimeslotsConsecutive(newTimeslots)) {
        alert(
          "Removing this timeslot would result in a non-consecutive selection. Please remove timeslots from the beginning or end of the selection."
        );
        return;
      }
      setSelectedTimeslots(newTimeslots);
      // Reset room and desk when timeslots change
      setSelectedRoom(null);
      setSelectedDesk(null);
    } else {
      // Add the timeslot to the selection
      const newTimeslots = [...selectedTimeslots, timeslot].sort();
      if (!areTimeslotsConsecutive(newTimeslots)) {
        alert("You can only select consecutive timeslots.");
        return;
      }
      setSelectedTimeslots(newTimeslots);
      // Reset room and desk when timeslots change
      setSelectedRoom(null);
      setSelectedDesk(null);
    }
  };

  const handleRoomClick = (room: Resource) => {
    if (selectedRoom && selectedRoom === room) {
      setSelectedRoom(null);
      setSelectedDesk(null);
      return;
    }
    setSelectedRoom(room);
    setSelectedDesk(null);
  };

  const handleDeskClick = (desk: Resource) => {
    if (selectedDesk && selectedDesk === desk) {
      setSelectedDesk(null);
      return;
    }
    setSelectedDesk(desk);
  };

  const handleConfirmReservation = async () => {
    if (
      !selectedDate ||
      !selectedDesk ||
      selectedTimeslots.length === 0 ||
      !user
    ) {
      alert(
        "Please make sure you have selected a date, timeslots, and a desk."
      );
      return;
    }

    try {
      // Check for conflicting reservations before creating the new reservation
      const latestReservations = await getFutureReservationsForDesk(
        selectedDesk.id
      );

      const conflictingReservation = latestReservations.find((reservation) => {
        const reservationDate = new Date(reservation.date)
          .toISOString()
          .split("T")[0];

        if (
          reservationDate === selectedDate &&
          reservation.status !== "Cancelled"
        ) {
          // Parse the timeslots from the reservation
          const reservedTimeslots =
            typeof reservation.timeslots === "string"
              ? JSON.parse(reservation.timeslots)
              : reservation.timeslots;

          // Check if there's any overlap between selected and reserved timeslots
          return selectedTimeslots.some((timeslot) =>
            Array.isArray(reservedTimeslots)
              ? reservedTimeslots.includes(timeslot)
              : false
          );
        }
        return false;
      });

      if (conflictingReservation) {
        alert(
          "Sorry, this desk has already been reserved for one or more of the selected timeslots. Please choose a different desk or timeslots."
        );

        // Refetch all reservations to update the UI
        const allDesks = resources.filter((r) => r.type === "Desk");
        const reservationPromises = allDesks.map((desk) =>
          getFutureReservationsForDesk(desk.id)
        );
        const allReservationsData = await Promise.all(reservationPromises);
        const flattenedReservations = allReservationsData.flat();
        setAllReservations(flattenedReservations);
        setSelectedDesk(null);

        return;
      }

      // No conflicts, proceed with creating the reservation
      await createReservation(
        selectedDesk.id,
        user.id,
        selectedDate,
        selectedTimeslots
      );
      alert("Reservation created successfully!");

      // Refetch reservations to update availability
      if (selectedDate) {
        const allDesks = resources.filter((r) => r.type === "Desk");
        const reservationPromises = allDesks.map((desk) =>
          getFutureReservationsForDesk(desk.id)
        );
        const allReservationsData = await Promise.all(reservationPromises);
        const flattenedReservations = allReservationsData.flat();
        setAllReservations(flattenedReservations);
      }

      // Reset selections
      setSelectedDate(null);
      setSelectedTimeslots([]);
      setSelectedRoom(null);
      setSelectedDesk(null);
      // Notify parent component to refetch resources
      if (onReservationCreated) {
        onReservationCreated();
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(`Failed to create reservation: ${error.message}.`);
      }
    }
  };

  // Helper function to check if a desk has all selected timeslots available
  const isDeskAvailableForTimeslots = (desk: Resource): boolean => {
    if (!selectedDate || selectedTimeslots.length === 0) return false;

    const deskTimeslots = getAvailableTimeslots(desk, selectedDate);

    // Get reserved timeslots for this desk
    const reservedTimeslots = getReservedTimeslotsForDesk(desk.id);

    // Check if all selected timeslots are available and not reserved
    return selectedTimeslots.every(
      (timeslot) =>
        deskTimeslots.includes(timeslot) &&
        !reservedTimeslots.includes(timeslot)
    );
  };

  // Helper function to get reserved timeslots for a specific desk
  const getReservedTimeslotsForDesk = (deskId: string): string[] => {
    if (!selectedDate) return [];

    return allReservations
      .filter((reservation) => {
        const reservationDate = new Date(reservation.date)
          .toISOString()
          .split("T")[0];
        return (
          reservation.resourceId === deskId &&
          reservationDate === selectedDate &&
          reservation.status === "Reserved"
        );
      })
      .flatMap((reservation) => {
        const timeslots =
          typeof reservation.timeslots === "string"
            ? JSON.parse(reservation.timeslots)
            : reservation.timeslots;
        return Array.isArray(timeslots) ? timeslots : [];
      });
  };

  // Helper function to check if desk has any timeslot overlap with selected timeslots
  const isDeskReservedForSelectedTimeslots = (desk: Resource): boolean => {
    if (!selectedDate || selectedTimeslots.length === 0) return false;

    const reservedTimeslots = getReservedTimeslotsForDesk(desk.id);

    // Check if any selected timeslot is already reserved
    return selectedTimeslots.some((timeslot) =>
      reservedTimeslots.includes(timeslot)
    );
  };

  // Get all unique timeslots available across all desks for the selected date
  const allAvailableTimeslots = selectedDate
    ? Array.from(
        new Set(
          resources
            .filter((r) => r.type === "Desk")
            .flatMap((desk) => getAvailableTimeslots(desk, selectedDate))
        )
      ).sort()
    : [];

  // Get all desks for a room (both available and reserved)
  const getAllDesksForRoom = (room: Resource): Resource[] => {
    return getDesksForRoom(room, resources);
  };

  // Calculate room capacity: reserved desks / total desks
  const getRoomCapacity = (
    room: Resource
  ): { reserved: number; total: number } => {
    const desks = getAllDesksForRoom(room);
    const total = desks.length;

    if (selectedTimeslots.length === 0) {
      return { reserved: 0, total };
    }

    const reserved = desks.filter((desk) =>
      isDeskReservedForSelectedTimeslots(desk)
    ).length;

    return { reserved, total };
  };

  // Filter rooms that have at least one desk with the selected timeslots in its availability
  // (regardless of whether it's already reserved)
  const availableRooms =
    selectedTimeslots.length > 0 && selectedDate
      ? rooms.filter((room) => {
          const desks = getAllDesksForRoom(room);
          return desks.some((desk) => {
            const deskTimeslots = getAvailableTimeslots(desk, selectedDate);
            // Check if desk has all selected timeslots in its availability
            return selectedTimeslots.every((timeslot) =>
              deskTimeslots.includes(timeslot)
            );
          });
        })
      : [];

  // Get all desks in selected room that have the selected timeslots in their availability
  // (including both available and reserved)
  const allDesksInRoom =
    selectedRoom && selectedTimeslots.length > 0 && selectedDate
      ? getAllDesksForRoom(selectedRoom).filter((desk) => {
          const deskTimeslots = getAvailableTimeslots(desk, selectedDate);
          // Check if desk has all selected timeslots in its availability
          return selectedTimeslots.every((timeslot) =>
            deskTimeslots.includes(timeslot)
          );
        })
      : [];

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4">Make a Reservation</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Column 1: Dates */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold mb-2">Select Date</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {dates.map((date) => (
              <ListEntry
                key={getISODate(date)}
                text={formatDate(date)}
                isSelected={selectedDate === getISODate(date)}
                onClick={() => handleDateClick(date)}
              />
            ))}
          </div>
        </div>

        {/* Column 2: Timeslots */}
        {selectedDate && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold mb-2">Select Time(s)</h3>
            <p className="text-sm text-gray-600 mb-2">
              Select one or more timeslots
            </p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {allAvailableTimeslots.map((timeslot) => (
                <ListEntry
                  key={timeslot}
                  text={timeslot}
                  isSelected={selectedTimeslots.includes(timeslot)}
                  onClick={() => handleTimeslotClick(timeslot)}
                />
              ))}
              {allAvailableTimeslots.length === 0 && (
                <p className="text-gray-500 text-sm">No timeslots available</p>
              )}
            </div>
          </div>
        )}

        {/* Column 3: Rooms */}
        {selectedTimeslots.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold mb-2">Select Room</h3>
            <p className="text-sm text-gray-600 mb-2">
              Reserved/Total desks shown
            </p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {availableRooms.map((room) => {
                const { reserved, total } = getRoomCapacity(room);
                return (
                  <ListEntry
                    key={room.id}
                    text={room.name}
                    capacity={reserved}
                    capacityLimit={total}
                    isSelected={selectedRoom?.id === room.id}
                    onClick={() => handleRoomClick(room)}
                  />
                );
              })}
              {availableRooms.length === 0 && (
                <p className="text-gray-500 text-sm">
                  No rooms available for selected timeslots
                </p>
              )}
            </div>
          </div>
        )}

        {/* Column 4: Desks */}
        {selectedRoom && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold mb-2">Select Desk</h3>
            <p className="text-sm text-gray-600 mb-2">
              Red = Reserved, Green = Available
            </p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {allDesksInRoom.map((desk) => {
                const isReserved = isDeskReservedForSelectedTimeslots(desk);
                const isAvailable = isDeskAvailableForTimeslots(desk);
                return (
                  <ListEntry
                    key={desk.id}
                    text={desk.name}
                    capacity={isReserved ? 1 : 0}
                    capacityLimit={1}
                    isSelected={selectedDesk?.id === desk.id}
                    onClick={() => handleDeskClick(desk)}
                    isReserved={isReserved}
                    disabled={!isAvailable}
                  />
                );
              })}
              {allDesksInRoom.length === 0 && (
                <p className="text-gray-500 text-sm">
                  No desks available for selected timeslots
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Section */}
      {selectedDesk && selectedTimeslots.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Reservation Summary</h3>
          <div className="space-y-1">
            <p>
              <strong>Date:</strong>{" "}
              {(() => {
                const selectedDateObject = dates.find(
                  (d) => getISODate(d) === selectedDate
                );
                return selectedDateObject ? formatDate(selectedDateObject) : "";
              })()}
            </p>
            <p>
              <strong>Time:</strong> {selectedTimeslots[0].substring(0, 5)} -{" "}
              {selectedTimeslots[selectedTimeslots.length - 1].substring(6)}
            </p>
            <p>
              <strong>Room:</strong> {selectedRoom?.name}
            </p>
            <p>
              <strong>Desk:</strong> {selectedDesk?.name}
            </p>
          </div>
          <button
            type="button"
            onClick={handleConfirmReservation}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Confirm Reservation
          </button>
        </div>
      )}
    </div>
  );
};

export default ReservationFlow;
