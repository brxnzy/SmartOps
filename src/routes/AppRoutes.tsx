import { Routes, Route } from "react-router-dom";
import Login from "../screens/auth/Login";
import Landing from "../screens/landing";
import Register from "../screens/auth/Register";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Routes>
  );
}
