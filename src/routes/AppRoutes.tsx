import { Routes, Route } from "react-router-dom";
import Login from "../screens/auth/Login";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<h1 className="text-7xl text-blue-800 font-medium">Hello SmartOps!</h1>} />
      <Route path="/login" element={<Login />} />
    </Routes>
  );
}
