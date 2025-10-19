// src/components/ProtectedRoute.tsx

import type React from "react";
import type { JSX } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const ProtectedRoute: React.FC<{ children: JSX.Element }> = ({ children }) => {
	const { user, loading } = useAuth();

	if (loading) return null;

	if (!user) {
		return <Navigate to="/login" replace />;
	}

	return children;
};

export default ProtectedRoute;
