// src/pages/SignUp.tsx

import { useEffect, useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import Timer from "../components/Timer";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

const SignUp: React.FC = () => {
	const navigate = useNavigate();
	const { user, loading } = useAuth();
	const emailId = useId();
	const usernameId = useId();
	const passwordId = useId();

	useEffect(() => {
		if (!loading && user) {
			navigate("/", { replace: true });
		}
	}, [user, loading, navigate]);
	const [email, setEmail] = useState("");
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [info, setInfo] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setInfo(null);
		setBusy(true);

		if (!email || !password || !username) {
			setBusy(false);

			setError("Please fill in all fields");
			return;
		}

		if (password.length < 6) {
			setBusy(false);
			setError("Password should be at least 6 characters long");
			return;
		}

		const { data: exists, error: rpcError } = await supabase.rpc(
			"email_exists",
			{
				check_email: email,
			},
		);

		if (rpcError) {
			setBusy(false);
			setError("Error checking email. Please try again.");
			return;
		}

		if (exists) {
			setBusy(false);
			setError("Email is already registered. Please sign in instead.");
			return;
		}

		// If we get here, try to sign up
		const { error: signUpError } = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: { username }, // will go into user_metadata
			},
		});

		if (signUpError) {
			setError(signUpError.message);
			setBusy(false);
			return;
		}

		setBusy(false);

		// Only show success message and redirect if there were no errors
		setInfo(
			"Check your email for a confirmation link. After confirming, you can sign in.",
		);
		// Redirect to login only on successful sign up
		setTimeout(() => {
			navigate("/login");
		}, 4000);
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
						htmlFor={usernameId}
						className="mr-3 text-3xl inline-block w-44"
					>
						Username:
					</label>
					<input
						id={usernameId}
						value={username}
						onChange={(e) => setUsername(e.target.value)}
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
				{info && <div className="text-green-600 mt-4">{info}</div>}

				<div className="flex gap-4">
					<button
						type="submit"
						disabled={busy}
						className="mt-4 p-2 bg-blue-600 text-white rounded-xl"
					>
						{busy ? "Signing up..." : "Sign Up"}
					</button>
					{/* <Link className="mt-4 p-2 border rounded-xl" to={"/login"}>
            Sign In
          </Link> */}
				</div>
			</form>
		</div>
	);
};

export default SignUp;
