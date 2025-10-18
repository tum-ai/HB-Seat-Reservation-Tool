import { useState, useEffect } from "react";
import ListEntry from "./ListEntry";
import type { Resource, Availability } from "../types/type";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

interface ReservationFlowProps {
  resources: Resource[];
}

const ReservationFlow = ({ resources }: ReservationFlowProps) => {
  const { user } = useAuth();
  // State management for selections
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Resource | null>(null);
  const [selectedDesk, setSelectedDesk] = useState<Resource | null>(null);
  const [selectedTimeslot, setSelectedTimeslot] = useState<string | null>(null);

  // Generate dates from today to same day next week
  const generateDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < 8; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    
    return dates;
  };

  const dates = generateDates();

  // Format date for display
  const formatDate = (date: Date) => {
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    return `${weekdays[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  };

  // Get ISO date string for comparison
  const getISODate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // Filter rooms (resources with type "Room")
  const rooms = resources.filter((resource) => resource.type === "Room");

  // Get desks for selected room
  const getDesksForRoom = (room: Resource): Resource[] => {
    if (!room.subResources || room.subResources.length === 0) {
      return [];
    }
    
    return resources.filter(
      (resource) =>
        resource.type === "Desk" && room.subResources.includes(resource.id)
    );
  };

  // Helper function to format time from "0800" to "08:00"
  const formatTime = (timeStr: string): string => {
    if (timeStr.length === 4) {
      return `${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)}`;
    }
    return timeStr;
  };

  // Helper function to format timeslot from "0800-0830" to "08:00-08:30"
  const formatTimeslot = (slot: string): string => {
    const [start, end] = slot.split('-');
    return `${formatTime(start)}-${formatTime(end)}`;
  };

  // Get availability timeslots for a desk on a specific date
  const getAvailableTimeslots = (desk: Resource, date: string): string[] => {
    // Parse availability JSON
    if (!desk.availability) {
      return [];
    }

    try {
      const availability: Availability = typeof desk.availability === 'string' 
        ? JSON.parse(desk.availability) 
        : (desk.availability as unknown as Availability);
      console.log("Parsed availability:", availability);
      
      // Convert date to weekday name
      const dateObj = new Date(date);
      const weekdayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const weekdayName = weekdayNames[dateObj.getDay()];
      
      // Get timeslots for the specific weekday
      // Availability structure: { "monday": ["0800-0830", "0830-0900", ...], "tuesday": [...], ... }
      let timeslots = availability[weekdayName] || [];
      
      // Filter out past timeslots if the selected date is today
      const today = new Date();
      const isToday = dateObj.toDateString() === today.toDateString();
      
      if (isToday) {
        const currentTime = today.getHours() * 100 + today.getMinutes(); // e.g., 14:30 -> 1430
        
        timeslots = timeslots.filter((slot) => {
          // Parse end time from slot format "0800-0830"
          const endTimeStr = slot.split('-')[1];
          const endTime = parseInt(endTimeStr, 10); // e.g., "0830" -> 830
          
          // Keep slots where end time is after or equal to current time
          return endTime >= currentTime;
        });
      }
      
      // Format timeslots to display with colons (e.g., "08:00-08:30")
      return timeslots.map(formatTimeslot);
    } catch (error) {
      console.error("Error parsing availability:", error);
      return [];
    }
  };

  // Reset subsequent selections when a parent selection changes
  useEffect(() => {
    setSelectedRoom(null);
    setSelectedDesk(null);
    setSelectedTimeslot(null);
  }, [selectedDate]);

  useEffect(() => {
    setSelectedDesk(null);
    setSelectedTimeslot(null);
  }, [selectedRoom]);

  useEffect(() => {
    setSelectedTimeslot(null);
  }, [selectedDesk]);

  const handleDateClick = (date: Date) => {
    setSelectedDate(getISODate(date));
  };

  const handleRoomClick = (room: Resource) => {
    setSelectedRoom(room);
  };

  const handleDeskClick = (desk: Resource) => {
    setSelectedDesk(desk);
  };

  const handleTimeslotClick = (timeslot: string) => {
    setSelectedTimeslot(timeslot);
  };

  const handleConfirmReservation = async () => {
    if (!selectedDate || !selectedDesk || !selectedTimeslot || !user) {
      alert("Please make sure you have selected a date, desk, and timeslot.");
      return;
    }

    const { error } = await supabase.from("reservations").insert([
      {
        resourceId: selectedDesk.id,
        userId: user.id,
        date: new Date(selectedDate).toISOString(),
        timeslots: [selectedTimeslot],
      },
    ]);

    if (error) {
      alert("Failed to create reservation: " + error.message);
    } else {
      alert("Reservation created successfully!");
      // Optionally, reset the selection
      setSelectedDate(null);
      setSelectedRoom(null);
      setSelectedDesk(null);
      setSelectedTimeslot(null);
    }
  };

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

        {/* Column 2: Rooms */}
        {selectedDate && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold mb-2">Select Room</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {rooms.map((room) => (
                <ListEntry
                  key={room.id}
                  text={room.name}
                  capacity={room.capacity}
                  capacityLimit={room.capacityLimit}
                  isSelected={selectedRoom?.id === room.id}
                  onClick={() => handleRoomClick(room)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Column 3: Desks */}
        {selectedRoom && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold mb-2">Select Desk</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {getDesksForRoom(selectedRoom).map((desk) => (
                <ListEntry
                  key={desk.id}
                  text={desk.name}
                  capacity={desk.capacity}
                  capacityLimit={desk.capacityLimit}
                  isSelected={selectedDesk?.id === desk.id}
                  onClick={() => handleDeskClick(desk)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Column 4: Timeslots */}
        {selectedDesk && selectedDate && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold mb-2">Select Time</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {getAvailableTimeslots(selectedDesk, selectedDate).map((timeslot) => (
                <ListEntry
                  key={timeslot}
                  text={timeslot}
                  isSelected={selectedTimeslot === timeslot}
                  onClick={() => handleTimeslotClick(timeslot)}
                />
              ))}
              {getAvailableTimeslots(selectedDesk, selectedDate).length === 0 && (
                <p className="text-gray-500 text-sm">No timeslots available</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Section */}
      {selectedTimeslot && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Reservation Summary</h3>
          <div className="space-y-1">
            <p><strong>Date:</strong> {dates.find(d => getISODate(d) === selectedDate) && formatDate(dates.find(d => getISODate(d) === selectedDate)!)}</p>
            <p><strong>Room:</strong> {selectedRoom?.name}</p>
            <p><strong>Desk:</strong> {selectedDesk?.name}</p>
            <p><strong>Time:</strong> {selectedTimeslot}</p>
          </div>
          <button
            onClick={handleConfirmReservation}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Confirm Reservation
          </button>
        </div>
      )}
    </div>
  );
};

export default ReservationFlow;
