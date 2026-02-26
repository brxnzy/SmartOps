import { Route, Routes } from "react-router-dom";
import Sidebar from "./layouts/Sidebar";
import Landing from "./screens/landing";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/sidebar" element={<Sidebar />} />
    </Routes>
  );
}

export default App;


