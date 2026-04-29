import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// import IntersectObserver from '@/components/common/IntersectObserver'; // 暂时禁用，避免崩溃
import ErrorBoundary from '@/components/ErrorBoundary';
import { Toaster } from '@/components/ui/sonner';
import { AdminProvider } from '@/contexts/AdminContext';

import { routes } from './routes';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AdminProvider>
        <Router>
          {/* <IntersectObserver /> */} {/* 暂时禁用，避免崩溃 */}
          <div className="flex flex-col min-h-screen">
            <main className="flex-grow">
              <Routes>
                {routes.map((route, index) => (
                  <Route
                    key={index}
                    path={route.path}
                    element={route.element}
                  />
                ))}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
          <Toaster />
        </Router>
      </AdminProvider>
    </ErrorBoundary>
  );
};

export default App;