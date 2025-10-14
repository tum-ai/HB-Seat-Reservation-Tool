interface ListEntryProps {
  text: string;
  capacity?: number;
  capacityLimit?: number;
  isSelected?: boolean;
  onClick?: () => void;
}

const ListEntry = ({
  text,
  capacity,
  capacityLimit,
  isSelected = false,
  onClick,
}: ListEntryProps) => {
  // Determine background color based on capacity
  const getBackgroundColor = () => {
    if (isSelected) {
      return "bg-blue-500 text-white";
    }
    
    if (capacity !== undefined && capacityLimit !== undefined) {
      const utilizationRate = capacity / capacityLimit;
      
      if (utilizationRate >= 1) {
        return "bg-red-100 hover:bg-red-200"; // Full
      } else if (utilizationRate >= 0.7) {
        return "bg-yellow-100 hover:bg-yellow-200"; // Almost full
      } else {
        return "bg-green-100 hover:bg-green-200"; // Available
      }
    }
    
    return "bg-gray-100 hover:bg-gray-200"; // Default
  };

  return (
    <button
      onClick={onClick}
      className={`
        w-full px-4 py-3 rounded-lg transition-all duration-200
        text-left font-medium
        ${getBackgroundColor()}
        ${onClick ? "cursor-pointer" : "cursor-default"}
      `}
    >
      <div className="flex justify-between items-center">
        <span>{text}</span>
        {capacity !== undefined && capacityLimit !== undefined && (
          <span className="text-sm opacity-70">
            {capacity}/{capacityLimit}
          </span>
        )}
      </div>
    </button>
  );
};

export default ListEntry;
