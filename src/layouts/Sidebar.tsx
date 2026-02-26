import React, { useState } from "react";
import Logo from "../assets/SmartOps.png";
type NavItem = {
  name: string;
  icon: React.ReactNode;
};

const navItems: NavItem[] = [
  {
    name: "Dashboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5.5v-6.5h-5V21H4a1 1 0 0 1-1-1v-9.5Z" />
      </svg>
    ),
  },
  {
    name: "Usuarios",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.5a5.5 5.5 0 0 0-6 0M17.5 10.5a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm-11 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm11 9a4.5 4.5 0 0 1 4.5-4.5M2 19.5A4.5 4.5 0 0 1 6.5 15" />
      </svg>
    ),
  },
  {
    name: "Proyectos",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5A2.5 2.5 0 0 1 5.5 5h4l1.5 2h7.5A2.5 2.5 0 0 1 21 9.5v9A2.5 2.5 0 0 1 18.5 21h-13A2.5 2.5 0 0 1 3 18.5v-11Z" />
      </svg>
    ),
  },
  {
    name: "Calendario",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3v3M16.5 3v3M3 9.5h18M5.5 5.5h13A2.5 2.5 0 0 1 21 8v10.5A2.5 2.5 0 0 1 18.5 21h-13A2.5 2.5 0 0 1 3 18.5V8a2.5 2.5 0 0 1 2.5-2.5Z" />
      </svg>
    ),
  },
  {
    name: "Documentos",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3h6l5 5v12.5A1.5 1.5 0 0 1 17 22H7.5A1.5 1.5 0 0 1 6 20.5v-16A1.5 1.5 0 0 1 7.5 3Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 3v5h5" />
      </svg>
    ),
  },
  {
    name: "Reportes",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5H12V3.5Zm2.5 0v6h6A8.5 8.5 0 0 0 14.5 3.5Z" />
      </svg>
    ),
  },
];

const teams = ["Heroicons", "Tailwind Labs", "Workcation"];

const Sidebar: React.FC = () => {
  const [selectedLink, setSelectedLink] = useState("Dashboard");

  return (
    <div className="flex min-h-screen w-full bg-white">
      <aside className="flex w-full max-w-[300px] flex-col rounded-r-3xl border-r border-slate-200 bg-slate-50 px-6 py-8 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <img src={Logo} alt="SmartOps logo" className="h-12 w-auto object-contain" />
          <span className="text-xl font-semibold text-slate-800">SmartOps</span>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <button
              key={item.name}
              onClick={() => setSelectedLink(item.name)}
              className={`flex w-full cursor-pointer items-center gap-4 rounded-xl px-3 py-3 text-left text-md   font-medium transition ${
                selectedLink === item.name
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:bg-white hover:text-blue-500"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.name}</span>
            </button>
          ))}
        </nav>


        <div className="mt-auto pt-16">
          <button
            onClick={() => setSelectedLink("Settings")}
            className={`flex cursor-pointer items-center gap-4 transition ${
              selectedLink === "Settings" ? "text-blue-500" : "text-slate-500 hover:text-blue-500"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 2.75a1.75 1.75 0 0 1 1.67 1.25l.3 1.03a6.9 6.9 0 0 1 1.61.93l1.03-.3a1.75 1.75 0 0 1 2.02.83l1 1.74a1.75 1.75 0 0 1-.35 2.15l-.73.74a6.95 6.95 0 0 1 0 1.86l.73.74a1.75 1.75 0 0 1 .35 2.15l-1 1.74a1.75 1.75 0 0 1-2.02.83l-1.03-.3a6.9 6.9 0 0 1-1.61.93l-.3 1.03A1.75 1.75 0 0 1 12 21.25h-2a1.75 1.75 0 0 1-1.67-1.25l-.3-1.03a6.9 6.9 0 0 1-1.61-.93l-1.03.3a1.75 1.75 0 0 1-2.02-.83l-1-1.74a1.75 1.75 0 0 1 .35-2.15l.73-.74a6.95 6.95 0 0 1 0-1.86l-.73-.74a1.75 1.75 0 0 1-.35-2.15l1-1.74a1.75 1.75 0 0 1 2.02-.83l1.03.3a6.9 6.9 0 0 1 1.61-.93l.3-1.03A1.75 1.75 0 0 1 10 2.75h2Z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
            </svg>
            <span className="text-lg font-medium">Settings</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-10">
        <h1 className="text-4xl font-bold text-slate-800">{selectedLink}</h1>
      </main>
    </div>
  );
};

export default Sidebar;
