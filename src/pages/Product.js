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
  const { user } = useAuth();
  const [existingRating, setExistingRating] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [latestProducts, setLatestProducts] = useState([]);
  const [viewedProducts, setViewedProducts] = useState([]);

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