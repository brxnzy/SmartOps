import { Route, Routes } from "react-router-dom"

function App() {

  return (
    <Routes>
      <Route path="/" element={<h1 className="text-3xl text-blue-800 font-medium">Hello SmartOps!</h1>} />
    </Routes>
  )
}

export default App
