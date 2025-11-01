import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReservationFlow from "../components/ReservationFlow";
import Timer from "../components/Timer";
import UpcomingReservations from "../components/UpcomingReservations";
import { getResources, getUserData, supabase } from "../lib/supabase";
import type { Resource, User } from "../types/type";

const Home = () => {
  const navigate = useNavigate();

  const [userId, setUserId] = useState<string | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  useEffect(() => {
    const fetchUserId = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        setUserId(null);
        return;
      }
      setUserId(data?.user?.id || null);
    };
    fetchUserId();
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      if (userId) {
        const data = await getUserData(userId);
        setUserData(data);
      }
    };
    fetchUserData();
  }, [userId]);

  useEffect(() => {
    const fetchResources = async () => {
      const data = await getResources();
      setResources(data);
    };
    fetchResources();
  }, []);

  const username = userData?.name || userData?.email?.split("@")[0] || "Guest";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleReservationUpdate = async () => {
    // Refetch resources when a reservation is cancelled or created
    const data = await getResources();
    setResources(data);
    // Trigger refresh of UpcomingReservations component
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="w-full p-8 md:p-16">
      <div className="flex justify-between items-center">
        <Timer />
        <button
          type="submit"
          onClick={handleSignOut}
          className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
        >
          Sign Out
        </button>
      </div>
      <h1 className="mt-4 text-5xl font-bold">Welcome {username}</h1>
      <div>
        <UpcomingReservations
          userId={userId}
          onReservationCancelled={handleReservationUpdate}
          refreshTrigger={refreshTrigger}
        />
        <ReservationFlow
          resources={resources}
          onReservationCreated={handleReservationUpdate}
        />
      </div>
    </div>
  );
};

export default Home;
