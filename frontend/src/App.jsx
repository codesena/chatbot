import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import ChatWindow from "./components/ChatWindow";
import SignUp from "./components/SignUp";
import SignIn from "./components/SignIn";
import { Analytics } from "@vercel/analytics/next";

const App = () => {
  return (
    <div className="bg-gray-700 min-h-screen">
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/signin" />} />
          <Route path="/chatbot" element={<ChatWindow />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signin" element={<SignIn />} />
        </Routes>
      </Router>
      <Analytics />
    </div>
  );
};

export default App;
