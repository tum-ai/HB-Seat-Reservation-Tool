import { Link } from "react-router-dom";
import Timer from "../components/Timer";

const SignUp = () => {
  return (
    <div className="w-full h-dvh flex flex-col items-start p-20">
      <Timer />
      <h1 className="text-3xl mt-10">Please book your slot</h1>
      <form className="mt-10">
        <div>
          <label id="email" className="mr-3 text-3xl inline-block w-44">
            Email:
          </label>
          <input id="email" className="border h-10 text-xl" />
        </div>
        <div className="mt-4">
          <label id="username" className="mr-3 text-3xl inline-block w-44">
            Username:
          </label>
          <input id="username" className="border h-10 text-xl" />
        </div>
        <div className="mt-4">
          <label id="password" className="mr-3 text-3xl inline-block w-44">
            Password:
          </label>
          <input id="password" className="border h-10 text-xl" />
        </div>
        <div className="flex gap-4">
          <button
            type="submit"
            className="mt-4 p-2 bg-blue-600 text-white rounded-xl"
          >
            Sign Up
          </button>
          <Link
            className="mt-4 p-2 bg-blue-600 text-white rounded-xl"
            to={"/login"}
          >
            Sign In
          </Link>
        </div>
      </form>
    </div>
  );
};

export default SignUp;
