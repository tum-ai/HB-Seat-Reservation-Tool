// src/pages/Login.tsx
import { Link, useNavigate } from "react-router-dom";
import Timer from "../components/Timer";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useEffect, useState } from "react";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setSubmitting(false);

    if (signInError) {
      // If the email requires confirmation supabase returns an error
      setError(signInError.message);
      return;
    }

    // On success the onAuthStateChange listener in AuthProvider will redirect automatically
    navigate("/", { replace: true });
  };

  return (
    <div className="w-full h-dvh flex flex-col items-start p-20">
      <Timer />
      <h1 className="text-3xl mt-10">Please book your slot</h1>
      <form className="mt-10" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="mr-3 text-3xl inline-block w-44">
            Email:
          </label>
          <input
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border h-10 text-xl"
          />
        </div>
        <div className="mt-4">
          <label htmlFor="password" className="mr-3 text-3xl inline-block w-44">
            Password:
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border h-10 text-xl"
          />
        </div>

        {error && <div className="text-red-600 mt-4">{error}</div>}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={submitting}
            className="mt-4 p-2 bg-blue-600 text-white rounded-xl"
          >
            {submitting ? "Signing in..." : "Sign In"}
          </button>
          <Link className="mt-4 p-2 border rounded-xl" to={"/signup"}>
            Sign Up
          </Link>
        </div>
      </form>
    </div>
  );
};

export default Login;
