import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await fetchUserProfile(session.user.id);
        } else {
          setUser(null);
          setUserProfile(null);
        }
      } catch (err) {
        console.error('Session error:', err);
        setUser(null);
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (data) {
        setUserProfile(data);
      } else {
        setUserProfile(null);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setUserProfile(null);
    }
  };

  const login = async (loginInput, password) => {
    let email = loginInput;
    
    // Если ввод не похож на email, ищем пользователя по нику
    if (!loginInput.includes('@')) {
      console.log('Ищем пользователя по нику:', loginInput);
      
      // Получаем все профили и ищем по нику
      const { data, error } = await supabase
        .from('profiles')
        .select('email, name');
      
      console.log('Все профили:', data, error);
      
      // Ищем точное совпадение по нику (case-insensitive)
      const foundProfile = data?.find(p => p.name?.toLowerCase() === loginInput.toLowerCase()) || null;
      
      if (!foundProfile) {
        throw new Error('Пользователь с таким никнеймом не найден.');
      }
      email = foundProfile.email;
      console.log('Найден email:', email);
    }

    console.log('Попытка входа с email:', email);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Ошибка входа:', error);
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Неверный email или пароль');
      }
      throw error;
    }
  };

  const register = async (email, password, name) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw error;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value = {
    user,
    userProfile,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
