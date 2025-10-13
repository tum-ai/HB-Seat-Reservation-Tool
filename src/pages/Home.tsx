import Timer from "../components/Timer";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const username =
    user?.user_metadata?.username || user?.email?.split("@")[0] || "Guest";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="w-full p-20">
      <div className="flex justify-between items-center">
        <Timer />
        <button
          onClick={handleSignOut}
          className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
        >
          Sign Out
        </button>
      </div>
      <h1 className="mt-4 text-5xl font-bold">Welcome {username}</h1>
    </div>
  );
};

export default Home;
