import type { Reservation, Resource } from "../types/type";
import { getTimeRange } from "../util/dateUtils";

interface ReservationCardProps {
  reservation: Reservation & { resource?: Resource };
  canCheckIn: boolean;
  isExpired: boolean;
  onCheckIn: (reservationId: string) => void;
  onCancel: (reservationId: string) => void;
}

const ReservationCard = ({
  reservation,
  canCheckIn,
  isExpired,
  onCheckIn,
  onCancel,
}: ReservationCardProps) => {
  const timeslots = Array.isArray(reservation.timeslots)
    ? reservation.timeslots
    : [];
  const timeRange = getTimeRange(timeslots);

  return (
    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div className="flex justify-between md:gap-8">
        <div className="flex items-center gap-2 ">
          <h3 className="font-semibold text-base truncate">
            {reservation.resource?.name || "Unknown Resource"}
          </h3>
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
        {reservation.status === "Completed" && (
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
            Checked-in
          </span>
        )}
        {isExpired && (
          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-medium">
            Expired
          </span>
        )}
        {!isExpired && canCheckIn && (
          <button
            type="button"
            onClick={() => onCheckIn(reservation.id)}
            className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium whitespace-nowrap"
          >
            Check-in
          </button>
        )}
        {!isExpired && reservation.status !== "Completed" && (
          <button
            type="button"
            onClick={() => onCancel(reservation.id)}
            className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium whitespace-nowrap"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default ReservationCard;
