// src/util/resourceUtils.ts
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
			const currentTime = today.getHours() * 100 + today.getMinutes();
			timeslots = timeslots.filter((slot) => {
				const endTimeStr = slot.split("-")[1];
				const endTime = parseInt(endTimeStr, 10);
				return endTime >= currentTime;
			});
		}

		return timeslots.map(formatTimeslot);
	} catch (error) {
		console.error("Error parsing availability:", error);
		return [];
	}
};
