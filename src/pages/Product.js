import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import styles from './Product.module.css';

const Product = ({ isSidebarCollapsed }) => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRating, setUserRating] = useState(0);
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [existingRating, setExistingRating] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [latestProducts, setLatestProducts] = useState([]);
  const [viewedProducts, setViewedProducts] = useState([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Состояния для блока вопросов
  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [newQuestionName, setNewQuestionName] = useState('');
  const [newQuestionEmail, setNewQuestionEmail] = useState('');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [isQuestionsExpanded, setIsQuestionsExpanded] = useState(false);

  const showToast = (message) => {
    setSuccessMessage(message);
    setShowSuccessModal(true);
    setTimeout(() => setShowSuccessModal(false), 3000);
  };


  const handleSubmitRating = async () => {
    if (!user || !userRating) return;

    try {
      // Upsert оценки - автоматически обновляет если существует, создает если нет
      const { error: ratingError } = await supabase
        .from('ratings')
        .upsert(
          {
            product_id: parseInt(id),
            user_id: user.id,
            score: userRating
          },
          {
            onConflict: 'user_id, product_id'
          }
        );

      if (ratingError) throw ratingError;

      setExistingRating(userRating);

      // Получаем актуальный рейтинг товара который уже обновился триггером
      const { data: updatedProduct, error: productError } = await supabase
        .from('products')
        .select('rating, rating_count')
        .eq('id', id)
        .single();

      if (productError) throw productError;

      // Обновляем локальные данные
      setProduct({
        ...product,
        rating: updatedProduct.rating,
        rating_count: updatedProduct.rating_count
      });

      // Показываем красивое модальное окно
      const message = existingRating ? 'Ваша оценка обновлена!' : 'Спасибо за вашу оценку!';
      showToast(message);
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('Ошибка при отправке оценки');
    }
  };

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*, categories(name)')
          .eq('id', id)
          .single();

        if (error) throw error;
        setProduct(data);

        // Сохраняем в историю просмотров
        const viewed = JSON.parse(localStorage.getItem('viewedProducts') || '[]');
        const filtered = viewed.filter(pid => pid !== parseInt(id));
        const newViewed = [parseInt(id), ...filtered].slice(0, 10);
        localStorage.setItem('viewedProducts', JSON.stringify(newViewed));

        // Загружаем последние добавленные товары
        const { data: latestData } = await supabase
          .from('products')
          .select('*, categories(name)')
          .neq('id', id)
          .order('id', { ascending: false })
          .limit(4);

        setLatestProducts(latestData || []);

        // Загружаем ранее просмотренные товары
        if (newViewed.length > 1) {
          const { data: viewedData } = await supabase
            .from('products')
            .select('*, categories(name)')
            .in('id', newViewed.slice(1, 5));

          setViewedProducts(viewedData || []);
        }

        // Проверяем оценку пользователя после загрузки товара
        if (user) {
          setTimeout(async () => {
            const { data: ratingData } = await supabase
              .from('ratings')
              .select('score')
              .eq('product_id', id)
              .eq('user_id', user.id)
              .maybeSingle();

            if (ratingData) {
              setExistingRating(ratingData.score);
              setUserRating(ratingData.score);
            }
          }, 0);
        }

      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, user]);

  // Загрузка вопросов товара
  useEffect(() => {
    const loadQuestions = async () => {
      if (!id) return;
      setQuestionsLoading(true);
      
      try {
        const { data } = await supabase
          .from('product_questions')
          .select(`
            *,
            product_answers(*)
          `)
          .eq('product_id', id)
          .eq('is_published', true)
          .order('created_at', { ascending: false });

        setQuestions(data || []);

        // Проверяем хэш в url для автоскролла до вопроса
        const hash = window.location.hash.replace('#question-', '');
        if (hash && data) {
          setTimeout(() => {
            const questionEl = document.getElementById(`question-${hash}`);
            if (questionEl) {
              setIsQuestionsExpanded(true);
              questionEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              questionEl.classList.add(styles.highlightedQuestion);
              setTimeout(() => questionEl.classList.remove(styles.highlightedQuestion), 3000);
            }
          }, 500);
        }
      } catch (e) {
        console.error('Ошибка загрузки вопросов:', e);
      } finally {
        setQuestionsLoading(false);
      }
    };

    loadQuestions();
  }, [id]);

  // Отправка нового вопроса
  const handleSubmitQuestion = async (e) => {
    e.preventDefault();
    if (!newQuestionText.trim() || !newQuestionName.trim()) return;

    setSubmittingQuestion(true);
    
    try {
      await supabase
        .from('product_questions')
        .insert({
          product_id: id,
          user_id: user?.id || null,
          user_name: newQuestionName.trim(),
          user_email: newQuestionEmail.trim() || null,
          question: newQuestionText.trim()
        });

      showToast('✅ Ваш вопрос отправлен на модерацию и будет опубликован после проверки');
      
      // Очищаем форму
      setNewQuestionName('');
      setNewQuestionEmail('');
      setNewQuestionText('');
      setShowQuestionForm(false);

    } catch (error) {
      console.error('Ошибка отправки вопроса:', error);
      alert('Ошибка при отправке вопроса');
    } finally {
      setSubmittingQuestion(false);
    }
  };

  useEffect(() => {
    const checkFavorite = async () => {
      if (!user) {
        // Для гостей проверяем localStorage
        const savedFavorites = JSON.parse(localStorage.getItem('light-favorites') || '[]');
        setIsFavorite(savedFavorites.some(item => item.id === parseInt(id)));
        return;
      }

      // Для авторизованных проверяем в БД
      try {
        const { data } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', user.id)
          .eq('product_id', parseInt(id))
          .maybeSingle();

        setIsFavorite(!!data);
      } catch (error) {
        console.error('Error check favorite:', error);
      }
    };

    checkFavorite();
  }, [id, user]);

  // ✅ Автоматически подставляем имя пользователя из уже загруженного профиля
  useEffect(() => {
    if (userProfile?.name) {
      setNewQuestionName(userProfile.name);
    } else {
      setNewQuestionName('');
    }
  }, [userProfile]);

  const toggleFavorite = async () => {
    if (!user) {
      // Для гостей остаётся localStorage
      const savedFavorites = JSON.parse(localStorage.getItem('light-favorites') || '[]');
      
      if (isFavorite) {
        const newFavorites = savedFavorites.filter(item => item.id !== parseInt(id));
        localStorage.setItem('light-favorites', JSON.stringify(newFavorites));
        setIsFavorite(false);
        showToast('Удалено из избранного');
      } else {
        savedFavorites.push({
          id: parseInt(id),
          name: product.name,
          price: product.price,
          image: product.image_url
        });
        localStorage.setItem('light-favorites', JSON.stringify(savedFavorites));
        setIsFavorite(true);
        showToast('Добавлено в избранное ❤️');
      }
      return;
    }

    // Для авторизованных пользователей работаем с БД
    try {
      if (isFavorite) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', parseInt(id));
        
        setIsFavorite(false);
        showToast('Удалено из избранного');
      } else {
        await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            product_id: parseInt(id)
          });
        
        setIsFavorite(true);
        showToast('Добавлено в избранное ❤️');
      }
    } catch (error) {
      console.error('Error toggle favorite:', error);
      alert('Ошибка при работе с избранным');
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopySuccess(true);
    showToast('Ссылка скопирована');
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleGoogleSearch = () => {
    const query = encodeURIComponent(`Как пользоваться ${product.name} инструкция руководство обзор`);
    window.open(`https://www.google.ru/search?q=${query}`, '_blank');
  };

  const handleAskAlice = () => {
    const query = encodeURIComponent(`Как пользоваться ${product.name}`);
    window.open(`https://yandex.ru/alice/ask?text=${query}`, '_blank');
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка товара...</div>;
  }

  if (!product) {
    return <div className={styles.notFound}>Товар не найден</div>;
  }

  return (
    <div className={styles.productContainer}>
      <button className={`${styles.backBtn} ${isSidebarCollapsed ? styles.backBtnCollapsed : ''}`} onClick={() => navigate(-1)}>
        <p>Назад</p>

      </button>

      <div className={styles.productPage}>
        <div className={styles.productImageWrapper}>
          <img
            src={product.image_url || 'https://via.placeholder.com/600x400'}
            alt={product.name}
            className={styles.productMainImage}
            onClick={() => setShowImageModal(true)}
          />
        </div>

        <div className={styles.productDetails}>
          <h1 className={styles.productTitle}>{product.name}</h1>

          <div className={styles.productMeta}>
            <span className={styles.categoryTag}>{product.categories?.name || 'Без категории'}</span>
            <div className={styles.rating}>
              {'★'.repeat(Math.round(product.rating || 0))}
              {'☆'.repeat(5 - Math.round(product.rating || 0))}
              <span className={styles.ratingCount}>({product.rating_count || 0} отзывов)</span>
            </div>
          </div>

          <p className={styles.productDescription}>{product.description}</p>

          <div className={styles.productPriceBlock}>
            <div className={styles.priceRow}>
              <span className={styles.productPrice}>{product.price} ₽</span>
              {product.stock > 0 ? (
                <span className={styles.inStock}>
                  <img src="/images/ico/icoIsAvaible.png" alt="В наличии" className={styles.stockIcon} />
                  В наличии: {product.stock} шт.
                </span>
              ) : (
                <span className={styles.outOfStock}>❌ Нет в наличии</span>
              )}
            </div>
          </div>

          <div className={styles.productActions}>
            <button
              className={styles.requestBtn}
              onClick={() => navigate('/requests', { state: { product } })}
              disabled={product.stock <= 0}
            >
              Оставить заявку
            </button>

            <button
              className={`${styles.actionBtn} ${isFavorite ? styles.favoriteActive : ''}`}
              onClick={toggleFavorite}
              title="Избранное"
            >
              {isFavorite ? '❤️' : '🤍'}
            </button>

            <button
              className={`${styles.actionBtn} ${copySuccess ? styles.copySuccess : ''}`}
              onClick={copyLink}
              title="Скопировать ссылку"
            >
              {copySuccess ? <img src="/images/ico/icoDone.png" alt="" className={styles.actionIcon} /> : '🔗'}
            </button>

            <button
              className={styles.actionBtn}
              onClick={handleGoogleSearch}
              title="Найти инструкцию в Google"
            >
              🔍
            </button>

            <button
              className={styles.actionBtn}
              onClick={handleAskAlice}
              title="Спросить Яндекс Алису"
            >
              🎙️
            </button>
          </div>

          <div className={styles.ratingBlock}>
            {user && (
              <>
                <p className={styles.ratingLabel}>Ваша оценка:</p>
                <div className={styles.userRatingStars}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <span
                      key={star}
                      className={userRating >= star ? styles.userStarActive : styles.userStar}
                      onClick={() => setUserRating(star)}
                    >
                      ★
                    </span>
                  ))}
                </div>
                {userRating > 0 && (
                  <button
                    className={styles.submitRatingBtn}
                    onClick={handleSubmitRating}
                  >
                    Отправить оценку
                  </button>
                )}
              </>
            )}

            <div className={styles.productMetaInfo}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Артикул:</span>
                <span className={styles.infoValue}>{product.id}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Категория:</span>
                <span className={styles.infoValue}>{product.categories?.name || 'Не указана'}</span>
          </div>
        </div>
      </div>

      {/* ✅ БЛОК ВОПРОСОВ О ТОВАРЕ */}
      <div className={styles.questionsSection}>
        <div 
          className={`${styles.questionsHeader} ${isQuestionsExpanded ? styles.expanded : ''}`}
          onClick={() => setIsQuestionsExpanded(!isQuestionsExpanded)}
          style={{cursor: 'pointer'}}
        >
          <h3 className={styles.questionsTitle}>Вопросы о товаре</h3>
          <span className={styles.toggleIcon}>{isQuestionsExpanded ? '▲' : '▼'}</span>
          <button 
            className={styles.askQuestionBtn} 
            onClick={(e) => {
              e.stopPropagation();
              setShowQuestionForm(!showQuestionForm);
              if (!isQuestionsExpanded) setIsQuestionsExpanded(true);
            }}
          >
            Задать вопрос
          </button>
        </div>

        <div className={`${styles.questionsContent} ${isQuestionsExpanded ? styles.expanded : ''}`}>
            {/* Форма добавления вопроса */}
            {showQuestionForm && (
              <form className={styles.questionForm} onSubmit={handleSubmitQuestion}>
            
              {userProfile ? (
                <div className={styles.userNameDisplay}>
                  <strong>{userProfile.name}</strong>
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="Ваше имя *"
                  value={newQuestionName}
                  onChange={(e) => setNewQuestionName(e.target.value)}
                  required
                  className={styles.formInput}
                />
              )}
              <textarea
                placeholder="Напишите ваш вопрос..."
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value.slice(0, 300))}
                required
                className={styles.formTextarea}
                rows="2"
                maxLength={300}
              />
              <div className={styles.charCounter}>
                {newQuestionText.length}/300
              </div>
              <div className={styles.formActions}>
                <button 
                  type="submit" 
                  className={styles.submitQuestionBtn}
                  disabled={submittingQuestion}
                >
                  {submittingQuestion ? 'Отправка...' : 'Отправить'}
                </button>
                <button 
                  type="button" 
                  className={styles.cancelQuestionBtn}
                  onClick={() => setShowQuestionForm(false)}
                >
                  Отмена
                </button>
              </div>
            </form>
            )}

            {/* Список вопросов */}
            {questionsLoading ? (
              <div className={styles.questionsLoading}>Загрузка...</div>
            ) : questions.length === 0 ? (
              <div className={styles.emptyQuestions}>
                <p>Пока нет вопросов. Будьте первым!</p>
              </div>
            ) : (
              <div className={styles.questionsList}>
            {questions.slice(0, 3).map(q => (
              <div key={q.id} id={`question-${q.id}`} className={styles.questionItem}>
                    <div className={styles.questionHeader}>
                      <span className={styles.questionAuthor}>{q.user_name}</span>
                      <span className={styles.questionDate}>
                        {new Date(q.created_at).toLocaleDateString('ru-RU')}
                      </span>
                      {q.is_answered && <span className={styles.answeredBadge}>✓</span>}
                    </div>
                    
                    <p className={styles.questionText}>{q.question}</p>

                    {/* Ответы на вопрос */}
                    {q.product_answers?.map(answer => (
                      <div key={answer.id} className={styles.answerBlock}>
                        <span className={styles.answerAuthor}>👤 {answer.responder_name}</span>
                        <p className={styles.answerText}>{answer.answer_text}</p>
                      </div>
                    ))}
                  </div>
                ))}
                
                {questions.length > 3 && (
                  <button className={styles.showMoreQuestionsBtn}>
                    Показать все вопросы ({questions.length})
                  </button>
                )}
              </div>
            )}
        </div>
      </div>
        </div>
      </div>

      {/* Модальное окно успеха */}
      {showSuccessModal && (
        <div className={styles.successModal}>
          <div className={styles.successModalContent}>
            <p className={styles.successText}>{successMessage}</p>
          </div>
        </div>
      )}

      {showImageModal && (
        <div className={styles.imageModal} onClick={() => setShowImageModal(false)}>

          <button
            className={`${styles.imageModalBtn} ${styles.imageModalPrev}`}
            onClick={(e) => {
              e.stopPropagation();
              // Тут можно будет добавить переключение между фото товара
            }}
          >
            ←
          </button>

          <div className={styles.imageModalImage} onClick={(e) => e.stopPropagation()}>
            <img
              src={product.image_url || 'https://via.placeholder.com/600x400'}
              alt={product.name}
            />
          </div>

          <button
            className={`${styles.imageModalBtn} ${styles.imageModalNext}`}
            onClick={(e) => {
              e.stopPropagation();
              // Тут можно будет добавить переключение между фото товара
            }}
          >
            →
          </button>

          <button className={styles.imageModalClose} onClick={() => setShowImageModal(false)}>✕</button>

        </div>
      )}

      {/* Последние добавленные товары */}
      {latestProducts.length > 0 && (
        <div className={styles.relatedSection}>
          <h2 className={styles.sectionTitle}>Последние добавленные товары</h2>
          <div className={styles.productsGrid}>
            {latestProducts.map(item => (
              <div key={item.id} className={styles.productCard} onClick={() => navigate(`/product/${item.id}`)}>
                <div className={styles.imageContainer}>
                  <img
                    src={item.image_url || 'https://via.placeholder.com/300x200'}
                    alt={item.name}
                    className={styles.productImage}
                  />
                </div>
                <div className={styles.cardInfo}>
                  <h3 className={styles.cardName}>{item.name}</h3>
                  <div className={styles.cardFooter}>
                    <span className={styles.cardPrice}>{item.price} ₽</span>
                    <div className={styles.cardRating}>
                      {'★'.repeat(Math.round(item.rating || 0))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Вы недавно смотрели */}
      {viewedProducts.length > 0 && (
        <div className={styles.relatedSection}>
          <h2 className={styles.sectionTitle}>Вы недавно смотрели</h2>
          <div className={styles.productsGrid}>
            {viewedProducts.map(item => (
              <div key={item.id} className={styles.productCard} onClick={() => navigate(`/product/${item.id}`)}>
                <div className={styles.imageContainer}>
                  <img
                    src={item.image_url || 'https://via.placeholder.com/300x200'}
                    alt={item.name}
                    className={styles.productImage}
                  />
                </div>
                <div className={styles.cardInfo}>
                  <h3 className={styles.cardName}>{item.name}</h3>
                  <div className={styles.cardFooter}>
                    <span className={styles.cardPrice}>{item.price} ₽</span>
                    <div className={styles.cardRating}>
                      {'★'.repeat(Math.round(item.rating || 0))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


    </div>
  );
};

export default Product;