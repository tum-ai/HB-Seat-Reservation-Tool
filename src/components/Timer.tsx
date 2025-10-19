import { useEffect, useState } from "react";

const Timer = () => {
	const [currentTime, setCurrentTime] = useState(new Date());

	useEffect(() => {
		const interval = setInterval(() => {
			setCurrentTime(new Date());
		}, 1000);

		return () => clearInterval(interval);
	}, []);
	return (
		<>
			{" "}
			<h1 className="text-4xl font-semibold">
				It is {currentTime.toLocaleString()}
			</h1>
		</>
	);
};

export default Timer;
