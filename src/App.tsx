// @ts-nocheck
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { ToastProvider } from "./context/ToastContext";
import { AppProvider } from "./context/AppContext";
import { ThemeProvider } from "./context/ThemeContext";
import ErrorBoundary from "./components/ErrorBoundary";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import CalendarPage from "./pages/CalendarPage";
import TimetablePage from "./pages/TimetablePage";
import TasksPage from "./pages/TasksPage";
import StudyPlannerPage from "./pages/StudyPlannerPage";
import PomodoroPage from "./pages/PomodoroPage";
import AcademicPage from "./pages/AcademicPage";
import AssignmentsPage from "./pages/AssignmentsPage";
import ExamsPage from "./pages/ExamsPage";
import NotesPage from "./pages/NotesPage";
import NotificationsPage from "./pages/NotificationsPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppProvider>
          <ThemeProvider>
            <HashRouter>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/timetable" element={<TimetablePage />} />
                  <Route path="/tasks" element={<TasksPage />} />
                  <Route path="/study" element={<StudyPlannerPage />} />
                  <Route path="/pomodoro" element={<PomodoroPage />} />
                  <Route path="/academic" element={<AcademicPage />} />
                  <Route path="/assignments" element={<AssignmentsPage />} />
                  <Route path="/exams" element={<ExamsPage />} />
                  <Route path="/notes" element={<NotesPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </HashRouter>
          </ThemeProvider>
        </AppProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
