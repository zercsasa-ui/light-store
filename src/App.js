import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import MainSidebar from './components/MainSidebar';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/ProtectedRoute';
import styles from './components/MainSidebar.module.css';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import Contacts from './pages/Contacts';
import Auth from './pages/Auth';
import Requests from './pages/Requests';
import Admin from './pages/Admin';
import Product from './pages/Product';

function App() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isCollapsed);
  }, [isCollapsed]);

  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/auth" element={<Auth />} />

        {/* Публичные страницы - доступны без авторизации */}
         <Route path="/" element={
           <>
             <MainSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
             <div className={`${styles.mainContent} ${isCollapsed ? styles.mainContentCollapsed : ''}`}>
               <Home />
             </div>
           </>
         } />
         <Route path="/catalog" element={
           <>
             <MainSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
             <div className={`${styles.mainContent} ${isCollapsed ? styles.mainContentCollapsed : ''}`}>
               <Catalog />
             </div>
           </>
         } />
         <Route path="/contacts" element={
           <>
             <MainSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
             <div className={`${styles.mainContent} ${isCollapsed ? styles.mainContentCollapsed : ''}`}>
               <Contacts />
             </div>
           </>
         } />
          <Route path="/product/:id" element={
            <>
              <MainSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
              <div className={`${styles.mainContent} ${isCollapsed ? styles.mainContentCollapsed : ''}`}>
                <Product isSidebarCollapsed={isCollapsed} />
              </div>
            </>
          } />

         {/* Защищённые страницы - только для авторизованных */}
         <Route path="/requests" element={
           <ProtectedRoute>
             <MainSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
             <div className={`${styles.mainContent} ${isCollapsed ? styles.mainContentCollapsed : ''}`}>
               <Requests />
             </div>
           </ProtectedRoute>
         } />
         <Route path="/admin" element={
           <ProtectedRoute>
             <MainSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
             <div className={`${styles.mainContent} ${isCollapsed ? styles.mainContentCollapsed : ''}`}>
               <Admin />
             </div>
           </ProtectedRoute>
         } />
      </Routes>
    </Router>
  );
}

export default App;