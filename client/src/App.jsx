import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Register from "./components/Register";
import Login from "./components/Login";
import Logout from "./components/Logout";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./components/Dashboard";
import NotFound from "./components/NotFound";
import Home from "./components/Home";
import DMCAReport from "./components/DMCAReport";
import DMCAStatus from "./components/DMCAStatus";
import NoticeList from "./components/NoticeList";
import NoticeReview from "./components/NoticeReview";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/logout" element={<Logout />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dmca/report"
          element={
            <ProtectedRoute>
              <DMCAReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dmca/status/:reportId"
          element={
            <ProtectedRoute>
              <DMCAStatus />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dmca/notices"
          element={
            <ProtectedRoute>
              <NoticeList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dmca/notice/:noticeId"
          element={
            <ProtectedRoute>
              <NoticeReview />
            </ProtectedRoute>
          }
        />
        {/* 404 route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
