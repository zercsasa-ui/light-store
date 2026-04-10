import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { preloadCatalog } from '../supabase';
import styles from './MainSidebar.module.css';
import ConfirmModal from './ConfirmModal';

const MainSidebar = ({ isCollapsed, setIsCollapsed }) => {
  const { userProfile, user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = userProfile?.role === 'admin';
  const isLoggedIn = !!user;
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const spans = document.querySelectorAll(`.${styles.sidebarLink} span, .${styles.logoutButton} span, .${styles.loginButton} span`);

    spans.forEach(el => {
      el.style.transition = 'none';
      el.style.opacity = '0';
      el.style.transform = 'translateX(-20px)';
      void el.offsetHeight; // force reflow
    });

    if (!isCollapsed) {
      setTimeout(() => {
        spans.forEach(el => {
          el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          el.style.opacity = '1';
          el.style.transform = 'translateX(0)';
        });
      }, 150);
    }
  }, [isCollapsed]);

  const handleLogout = async () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    try {
      await logout();
      setTimeout(() => {
        navigate('/auth', { replace: true });
      }, 100);
    } catch (error) {
      console.error('Ошибка при выходе:', error);
      navigate('/auth', { replace: true });
    }
  };

  return (
    <>
    <nav className={`${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed : ''} ${isMobileMenuOpen ? styles.sidebarMobileOpen : ''}`}>
      <button className={styles.toggleButton} onClick={() => setIsCollapsed(!isCollapsed)}>
        {isCollapsed ? '→' : '←'}
      </button>

      {/* Кнопка бургер для мобильных */}
      <button className={styles.burgerButton} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
        <span className={`${styles.burgerLine} ${isMobileMenuOpen ? styles.burgerLineOpen : ''}`}></span>
      </button>

      <div className={styles.sidebarHeader}>
        {!isCollapsed && <h2>Light Store</h2>}
        {isCollapsed && <img src="/images/ico/icoLogo.png" alt="Logo" className={styles.logoIcon} onClick={() => setIsCollapsed(false)} />}
        {userProfile ? (
          <div className={styles.userInfo}>
            <span className={styles.userName}>{userProfile.name}</span>
            <span className={styles.userRole}>
              {userProfile.role === 'admin' ? 'Админ' : userProfile.role === 'manager' ? 'Менеджер' : 'Пользователь'}
            </span>
          </div>
        ) : (
          <div className={styles.guestInfo}>
            <span className={styles.guestText}>Гость</span>
          </div>
        )}
      </div>
      <ul className={`${styles.sidebarNav} ${isMobileMenuOpen ? styles.sidebarNavMobileOpen : ''}`}>
          <li>
            <NavLink
              to="/"
              end
              className={({ isActive }) => isActive ? `${styles.sidebarLink} ${styles.sidebarLinkActive}` : styles.sidebarLink}
            >
              <img src="/images/ico/icoMain.png" alt="" className={styles.linkIcon} />
              {!isCollapsed && <span>Главная</span>}
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/catalog"
              onMouseEnter={() => preloadCatalog()}
              onFocus={() => preloadCatalog()}
              className={({ isActive }) => isActive ? `${styles.sidebarLink} ${styles.sidebarLinkActive}` : styles.sidebarLink}
            >
              <img src="/images/ico/icoCatalog.png" alt="" className={styles.linkIcon} />
              {!isCollapsed && <span>Каталог</span>}
            </NavLink>
          </li>
           <li>
             <NavLink
               to="/contacts"
               className={({ isActive }) => isActive ? `${styles.sidebarLink} ${styles.sidebarLinkActive}` : styles.sidebarLink}
             >
               <img src="/images/ico/icoKontakt.png" alt="" className={styles.linkIcon} />
               {!isCollapsed && <span>Контакты</span>}
             </NavLink>
           </li>
           <li>
             <NavLink
               to="/calculator"
               className={({ isActive }) => isActive ? `${styles.sidebarLink} ${styles.sidebarLinkActive}` : styles.sidebarLink}
             >
               <img src="/images/ico/calcumIco.png" alt="" className={styles.linkIcon} />
               {!isCollapsed && <span>Калькулятор</span>}
             </NavLink>
           </li>
           <li>
             <NavLink
               to="/profile"
               className={({ isActive }) => isActive ? `${styles.sidebarLink} ${styles.sidebarLinkActive}` : styles.sidebarLink}
             >
                <img src="/images/ico/icoProfile.png" alt="" className={styles.linkIcon} />
                {!isCollapsed && <span>Профиль</span>}
             </NavLink>
           </li>
          {isLoggedIn && (
            <>
              <li>
                <NavLink
                  to="/requests"
                  className={({ isActive }) => isActive ? `${styles.sidebarLink} ${styles.sidebarLinkActive}` : styles.sidebarLink}
                >
                  <img src="/images/ico/icoRequiest.png" alt="" className={styles.linkIcon} />
                  {!isCollapsed && <span>Заявки</span>}
                </NavLink>
              </li>
              {isAdmin && (
                <li>
                  <NavLink
                    to="/admin"
                    className={({ isActive }) => isActive ? `${styles.sidebarLink} ${styles.sidebarLinkActive}` : styles.sidebarLink}
                  >
                    <img src="/images/ico/icoAdmin.png" alt="" className={styles.linkIcon} />
                    {!isCollapsed && <span>Админ-панель</span>}
                  </NavLink>
                </li>
              )}
            </>
          )}
          <li className={styles.mobileOnlyBtn}>
            {isLoggedIn ? (
              <button className={styles.logoutButton} onClick={handleLogout}>
                <img src="/images/ico/icologout.png" alt="" className={styles.buttonIcon} />
                <span>Выйти</span>
              </button>
            ) : (
              <button className={styles.loginButton} onClick={() => navigate('/auth')}>
                <img src="/images/ico/icoAvtorize.png" alt="" className={styles.buttonIcon} />
                <span>Войти</span>
              </button>
            )}
          </li>
        </ul>
        <div className={styles.sidebarFooter}>
          {isLoggedIn ? (
            <button className={styles.logoutButton} onClick={handleLogout}>
              <img src="/images/ico/icologout.png" alt="" className={styles.buttonIcon} />
              {!isCollapsed && <span>Выйти</span>}
            </button>
          ) : (
            <button className={styles.loginButton} onClick={() => navigate('/auth')}>
              <img src="/images/ico/icoAvtorize.png" alt="" className={styles.buttonIcon} />
              {!isCollapsed && <span>Войти</span>}
            </button>
          )}
        </div>
      </nav>

      {/* Модальное окно подтверждения выхода */}
      {showLogoutModal && (
        <ConfirmModal
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          onConfirm={confirmLogout}
          title="Выход из аккаунта"
          message="Вы действительно хотите выйти из аккаунта?"
          confirmText="Выйти"
        />
      )}
    </>
  );
};

export default MainSidebar;