import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Auth.module.css';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loginInput, setLoginInput] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { login, register, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Функция экранирования XSS
  const sanitizeInput = (input) => {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML.replace(/[<>"'&/]/g, '').trim();
  };

  // Валидация email
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Валидация имени
  const validateName = (name) => {
    return name.length >= 2 && name.length <= 30;
  };

  // Валидация пароля
  const validatePassword = (password) => {
    return password.length >= 6 && password.length <= 128;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isLogin) {
        if (!loginInput.trim() || !password) {
          throw new Error('Заполните все поля');
        }

        const sanitizedLogin = sanitizeInput(loginInput);
        
        if (sanitizedLogin.length < 2) {
          throw new Error('Некорректный логин');
        }

        await login(sanitizedLogin, password);
        navigate('/');
      } else {
        if (!email.trim() || !password || !name.trim()) {
          throw new Error('Заполните все поля');
        }

        const sanitizedName = sanitizeInput(name);
        const sanitizedEmail = sanitizeInput(email);

        if (!validateName(sanitizedName)) {
          throw new Error('Имя должно быть от 2 до 30 символов');
        }

        if (!validateEmail(sanitizedEmail)) {
          throw new Error('Введите корректный email адрес');
        }

        if (!validatePassword(password)) {
          throw new Error('Пароль должен быть от 6 до 128 символов');
        }

        await register(sanitizedEmail, password, sanitizedName);
        setSuccess('Регистрация успешна! Теперь вы можете войти.');
        setTimeout(() => setIsLogin(true), 2000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <button className={styles.backToHomeBtn} onClick={() => navigate('/')}>
        ← На главную
      </button>
      <div className={styles.authCard}>
        <h2 className={styles.authTitle}>
          {isLogin ? 'Вход' : 'Регистрация'}
        </h2>
        
        {error && <div className={styles.errorMessage}>{error}</div>}
        {success && <div className={styles.successMessage}>{success}</div>}
        
        <form className={styles.authForm} onSubmit={handleSubmit}>
          {isLogin ? (
            <div className={styles.formGroup}>
              <label htmlFor="loginInput">Email или никнейм</label>
              <input
                type="text"
                id="loginInput"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                placeholder="Введите email или никнейм"
                required
              />
            </div>
          ) : (
            <>
              <div className={styles.formGroup}>
                <label htmlFor="name">Никнейм</label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Придумайте никнейм"
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Введите email"
                  required
                />
              </div>
            </>
          )}
          
          <div className={styles.formGroup}>
            <label htmlFor="password">Пароль</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              required
              minLength={6}
            />
          </div>
          
          <button 
            type="submit" 
            className={styles.authButton}
            disabled={loading}
          >
            {loading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Зарегистрироваться')}
          </button>
        </form>
        
        <div className={styles.authSwitch}>
          {isLogin ? (
            <p>
              Нет аккаунта?{' '}
              <button type="button" onClick={() => setIsLogin(false)}>
                Зарегистрироваться
              </button>
            </p>
          ) : (
            <p>
              Уже есть аккаунт?{' '}
              <button type="button" onClick={() => setIsLogin(true)}>
                Войти
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;