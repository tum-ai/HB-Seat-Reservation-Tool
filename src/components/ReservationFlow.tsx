import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import type { Resource } from "../types/type";
import { formatDate, generateDates, getISODate } from "../util/dateUtils";
import {
	createReservation,
	revertAvailability,
	updateResourceAvailability,
} from "../util/reservationUtils";
import { getAvailableTimeslots, getDesksForRoom } from "../util/resourceUtils";
import ListEntry from "./ListEntry";

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

	const dates = generateDates();

	// Filter rooms (resources with type "Room")
	const rooms = resources.filter((resource) => resource.type === "Room");

	// Reset subsequent selections when a parent selection changes
	useEffect(() => {
		setSelectedRoom(null);
		setSelectedDesk(null);
		setSelectedTimeslot(null);
	}, []);

	useEffect(() => {
		setSelectedDesk(null);
		setSelectedTimeslot(null);
	}, []);

	useEffect(() => {
		setSelectedTimeslot(null);
	}, []);

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

		const originalAvailability = selectedDesk.availability;

		try {
			await updateResourceAvailability(
				selectedDesk,
				selectedDate,
				selectedTimeslot,
			);
		} catch (error: unknown) {
			if (error instanceof Error) {
				alert(`Failed to update resource availability: ${error.message}`);
				return;
			}
		}

		try {
			await createReservation(
				selectedDesk.id,
				user.id,
				selectedDate,
				selectedTimeslot,
			);
			alert("Reservation created successfully!");
			// Reset selections
			setSelectedDate(null);
			setSelectedRoom(null);
			setSelectedDesk(null);
			setSelectedTimeslot(null);
		} catch (error: unknown) {
			if (error instanceof Error) {
				alert(
					`Failed to create reservation: ${error.message}. Reverting availability change.`,
				);
				await revertAvailability(selectedDesk.id, originalAvailability);
			}
		}
	};

	const availableDesks =
		selectedRoom && selectedDate
			? getDesksForRoom(selectedRoom, resources).filter(
					(desk) => getAvailableTimeslots(desk, selectedDate).length > 0,
				)
			: [];

	const availableTimeslots =
		selectedDesk && selectedDate
			? getAvailableTimeslots(selectedDesk, selectedDate)
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
							{availableDesks.map((desk) => (
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
							{availableTimeslots.map((timeslot) => (
								<ListEntry
									key={timeslot}
									text={timeslot}
									isSelected={selectedTimeslot === timeslot}
									onClick={() => handleTimeslotClick(timeslot)}
								/>
							))}
							{availableTimeslots.length === 0 && (
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
						<p>
							<strong>Date:</strong> {(() => {
								const selectedDateObject = dates.find(
									(d) => getISODate(d) === selectedDate,
								);
								return selectedDateObject ? formatDate(selectedDateObject) : "";
							})()}
						</p>
						<p>
							<strong>Room:</strong> {selectedRoom?.name}
						</p>
						<p>
							<strong>Desk:</strong> {selectedDesk?.name}
						</p>
						<p>
							<strong>Time:</strong> {selectedTimeslot}
						</p>
					</div>
					<button
						type="button"
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
