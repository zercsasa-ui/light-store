import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import styles from './Profile.module.css';

const Profile = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [userQuestions, setUserQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  
  // Доступные аватарки
  const avatars = ['😎', '👽', '🦊', '🐱'];
  
  // Получаем выбранный аватар из localStorage
  const getCurrentAvatar = () => {
    if (!user) return user?.email?.charAt(0).toUpperCase() || 'U';
    const saved = localStorage.getItem(`avatar_${user.id}`);
    return saved || user.email?.charAt(0).toUpperCase() || 'U';
  };
  
  const [currentAvatar, setCurrentAvatar] = useState('U');
  const [showAvatarHint, setShowAvatarHint] = useState(() => {
    return localStorage.getItem('avatar_hidden') !== 'true';
  });

  // Обновляем аватар когда пользователь загрузится
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`avatar_${user.id}`);
      setCurrentAvatar(saved || user.email?.charAt(0).toUpperCase() || 'U');
    }
  }, [user]);

  // Загрузка вопросов которые задал пользователь
  useEffect(() => {
    const loadUserQuestions = async () => {
      if (!user) return;
      setQuestionsLoading(true);

      try {
        const { data } = await supabase
          .from('product_questions')
          .select(`
            *,
            products(name, id),
            product_answers(*)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        setUserQuestions(data || []);
      } catch (e) {
        console.error('Ошибка загрузки вопросов:', e);
      } finally {
        setQuestionsLoading(false);
      }
    };

    loadUserQuestions();
  }, [user]);

  useEffect(() => {
    const loadFavorites = async () => {
      setLoading(true);
      
      if (!user) {
        // Для гостей подтягиваем из localStorage
        const savedFavorites = localStorage.getItem('light-favorites');
        if (savedFavorites) {
          setFavorites(JSON.parse(savedFavorites));
        }
        setLoading(false);
        return;
      }

      // Для авторизованных подтягиваем из БД
      try {
        const { data } = await supabase
          .from('favorites')
          .select(`
            *,
            products (*)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (data) {
          // Форматируем данные в привычный формат
          const formatted = data.map(item => ({
            id: item.products.id,
            name: item.products.name,
            price: item.products.price,
            image: item.products.image_url
          }));
          setFavorites(formatted);
        }
      } catch (error) {
        console.error('Error load favorites:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFavorites();
  }, [user]);

  const removeFromFavorites = async (id) => {
    if (!user) {
      // Для гостей
      const newFavorites = favorites.filter(item => item.id !== id);
      setFavorites(newFavorites);
      localStorage.setItem('light-favorites', JSON.stringify(newFavorites));
      return;
    }

    // Для авторизованных
    try {
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', id);

      // Обновляем локальное состояние
      setFavorites(favorites.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error remove favorite:', error);
    }
  };

  return (
    <div className={styles.profileContainer}>
      <h1 className={styles.title}>Профиль</h1>

      {user ? (
          <div className={styles.userInfo}>
          <div className={styles.avatar} onClick={() => setShowAvatarPicker(!showAvatarPicker)}>
            {currentAvatar}
          </div>
           <div className={styles.userDetails}>
             <h2 className={styles.userName}>{userProfile?.name || 'Пользователь'}</h2>
             <p className={styles.userEmail}>{user.email}</p>
             <p className={styles.date}>Зарегистрирован: {new Date(user.created_at).toLocaleDateString('ru-RU')}</p>
            
            {showAvatarHint && (
              <div className={styles.avatarHint}>
                <span>💡 Нажмите на аватар чтобы сменить его</span>
                <button onClick={() => {
                  setShowAvatarHint(false);
                  localStorage.setItem('avatar_hidden', 'true');
                }}>✕</button>
              </div>
            )}
            
            {showAvatarPicker && (
              <div className={styles.avatarPicker}>
                <p>Выберите аватар:</p>
                <div className={styles.avatarList}>
                  {avatars.map((emoji, index) => (
                    <span 
                      key={index} 
                      className={currentAvatar === emoji ? styles.avatarSelected : ''}
                      onClick={() => {
                        setCurrentAvatar(emoji);
                        localStorage.setItem(`avatar_${user.id}`, emoji);
                        setShowAvatarPicker(false);
                      }}
                    >
                      {emoji}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={styles.guestMessage}>
          <p>Вы вошли как гость</p>
          <p className={styles.note}>Избранные товары сохраняются только на этом устройстве</p>
        </div>
      )}

      <div className={styles.section}>
        <h2>Избранные товары ({favorites.length})</h2>

        {favorites.length === 0 ? (
          <div className={styles.emptyState}>
            <p>У вас пока нет сохранённых товаров</p>
            <p className={styles.note}>Нажмите ❤️ на товаре чтобы добавить сюда</p>
          </div>
        ) : (
          <div className={styles.favoritesGrid}>
            {favorites.map(product => (
              <div key={product.id} className={styles.favoriteCard} onClick={() => navigate(`/product/${product.id}`)}>
                <div className={styles.cardImage}>
                  <img src={product.image || 'https://via.placeholder.com/300x200'} alt={product.name} />
                </div>
                <div className={styles.cardBody}>
                  <h4>{product.name}</h4>
                  <p className={styles.price}>{product.price} ₽</p>
                </div>
                <button 
                  className={styles.removeBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromFavorites(product.id);
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
       </div>

       {/* Секция мои вопросы */}
       <div className={styles.section}>
         <h2>Мои вопросы о товарах ({userQuestions.length})</h2>

         {questionsLoading ? (
           <div className={styles.emptyState}>
             <p>Загрузка вопросов...</p>
           </div>
         ) : userQuestions.length === 0 ? (
           <div className={styles.emptyState}>
             <p>Вы еще не задавали вопросы о товарах</p>
             <p className={styles.note}>Все ваши вопросы будут отображаться здесь</p>
           </div>
         ) : (
           <div className={styles.questionsList}>
             {userQuestions.map(q => (
                <div 
                  key={q.id} 
                  className={styles.questionItem}
                  onClick={() => navigate(`/product/${q.products.id}#question-${q.id}`)}
                  style={{cursor: 'pointer'}}
                >
                 <div className={styles.questionHeader}>
                   <span 
                     className={styles.questionProduct}
                     onClick={() => navigate(`/product/${q.products.id}`)}
                   >
                     📦 {q.products.name}
                   </span>
                   <span className={styles.questionDate}>
                     {new Date(q.created_at).toLocaleDateString('ru-RU')}
                   </span>
                   {q.is_answered && <span className={styles.answeredBadge}>✅ Отвечено</span>}
                   {!q.is_published && <span className={styles.moderationBadge}>⏳ На модерации</span>}
                 </div>
                 
                 <p className={styles.questionText}>{q.question}</p>

                 {/* Ответ на вопрос */}
                 {q.product_answers?.map(answer => (
                   <div key={answer.id} className={styles.answerBlock}>
                     <span className={styles.answerAuthor}>👤 {answer.responder_name}</span>
                     <p className={styles.answerText}>{answer.answer_text}</p>
                   </div>
                 ))}
               </div>
             ))}
           </div>
         )}
       </div>

     </div>
   );
 };

export default Profile;