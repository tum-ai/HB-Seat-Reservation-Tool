// src/pages/Login.tsx

import { useEffect, useId, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Timer from "../components/Timer";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const emailId = useId();
  const passwordId = useId();
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

  const signInWithSlack = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "slack_oidc",
      options: {
        redirectTo: `http://localhost:5173/`,
      },
    });

    if (error) {
      setError(error.message);
      return;
    }
  };

  return (
    <div className="w-full h-dvh flex flex-col items-start p-20">
      <Timer />
      <h1 className="text-3xl mt-10">Please book your slot</h1>
      <form className="mt-10" onSubmit={handleSubmit}>
        <div>
          <label htmlFor={emailId} className="mr-3 text-3xl inline-block w-44">
            Email:
          </label>
          <input
            id={emailId}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border h-10 text-xl"
          />
        </div>
        <div className="mt-4">
          <label
            htmlFor={passwordId}
            className="mr-3 text-3xl inline-block w-44"
          >
            Password:
          </label>
          <input
            id={passwordId}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border h-10 text-xl"
          />
        </div>

        {error && <div className="text-red-600 mt-4">{error}</div>}

        <div className="flex flex-col">
          {/* Email Sign In */}
          <div className="flex justify-between gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="mt-4 p-2 bg-blue-600 text-white rounded-xl w-full cursor-pointer"
            >
              {submitting ? "Signing in..." : "Sign In with Email"}
            </button>
            <Link
              className="mt-4 p-2 border rounded-xl w-full text-center"
              to={"/signup"}
            >
              Sign Up with Email
            </Link>
          </div>

          {/* Divider */}
          <div className="flex items-center my-4">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-4 text-gray-500">or</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          {/* Slack Sign In */}
          {submitting ? (
            <div className="w-full h-12 flex items-center justify-center text-gray-500">
              Redirecting...
            </div>
          ) : (
            <button
              type="button"
              onClick={signInWithSlack}
              className="cursor-pointer w-full h-12 object-contain"
            >
              <img
                src="https://platform.slack-edge.com/img/sign_in_with_slack.png"
                srcSet="https://platform.slack-edge.com/img/sign_in_with_slack.png 1x, https://platform.slack-edge.com/img/sign_in_with_slack.png 2x"
                alt="Sign in with Slack"
                style={{ display: "block" }}
              />
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default Login;
