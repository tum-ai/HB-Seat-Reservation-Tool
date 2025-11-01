import { useEffect, useState } from "react";

interface ReservationRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ReservationRulesModal = ({
  isOpen,
  onClose,
}: ReservationRulesModalProps) => {
  const [showModal, setShowModal] = useState(isOpen);

  useEffect(() => {
    setShowModal(isOpen);
  }, [isOpen]);

  if (!showModal) return null;

  const handleClose = () => {
    setShowModal(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-transparent bg-opacity-50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900">⚠️ Rules ⚠️</h2>
            <button
              type="button"
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Close</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="space-y-6 text-gray-700">
            <section>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">
                📋 General Rules
              </h3>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Each user books for himself/herself</li>
                <li>...but only one reservation per user per timeslot!</li>
                <li>
                  One reservation can only consist of CONSECUTIVE time slots
                </li>
                <li>
                  Remember to CHECK-IN: it's possible to check in up to 5
                  minutes before your reservation starts and 15 minutes after it
                  starts.
                </li>
                <li>
                  You'll need to be in the Unite building and allow location
                  access for check-in
                </li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">
                ⏰ Booking Times
              </h3>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Seats can be reserved between 8:00 AM and 24:00 PM</li>
                <li>Booking window opens 7 days in advance</li>
                <li>
                  Same-day reservations are possible based on seat availability
                </li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">
                🚫 Cancellation Policy
              </h3>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>
                  If you made a mistake or can't make it in time, please cancel
                  your reservation as soon as possible.
                </li>
                <li>
                  No-shows (missing check-in 15 minutes after reservation
                  starts) will be recorded and may result in booking
                  restrictions
                </li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">
                ✅ Best Practices
              </h3>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Keep your workspace clean and tidy</li>
                <li>Respect other users and maintain a pleasant environment</li>
                <li>Only book seats you intend to use</li>
                <li className="font-bold">
                  <a
                    href="/assets/Homebase_Rulebook.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline hover:text-blue-800 cursor-pointer"
                  >
                    VIEW AND FOLLOW THE HOMEBASE RULEBOOK
                  </a>
                </li>
              </ul>
            </section>

            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> Violation of these rules may result in
                temporary or permanent suspension of booking privileges and/or
                access to the homebase.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold"
            >
              I Understand
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReservationRulesModal;
