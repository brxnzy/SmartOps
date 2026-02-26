import AppRoutes from "./routes/AppRoutes";
import { Toaster } from "sileo";

function App() {
  return (
    <>
      <Toaster position="top-right" />
      <AppRoutes />
    </>
  );
}

export default App;
