import { memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import styles from '../pages/Catalog.module.css';

// ✅ Мемоизированная карточка товара - не перерисовывается при фильтрации
const ProductCard = memo(({ product }) => {
  const navigate = useNavigate();

  // ✅ Предзагрузка товара в кеш при наведении курсора
  const preloadProduct = useCallback(async () => {
    try {
      await supabase
        .from('products')
        .select('*')
        .eq('id', product.id)
        .single();
      
      console.log(`✅ Товар ${product.id} предзагружен`);
    } catch (e) {
      // Тихо игнорируем ошибки предзагрузки
    }
  }, [product.id]);

  return (
    <div 
      className={styles.productCard}
      onMouseEnter={preloadProduct}
      onFocus={preloadProduct}
    >
      <div className={styles.imageContainer}>
        <img 
          src={product.image_url || 'https://via.placeholder.com/300x200'} 
          alt={product.name}
          className={styles.productImage}
          loading="lazy"
          width="300"
          height="200"
        />
      </div>
      <div className={styles.productInfo}>
        <h3 className={styles.productName}>{product.name}</h3>
        <p className={styles.productDescription}>{product.description}</p>
        <div className={styles.productFooter}>
          <span className={styles.productPrice}>{product.price} ₽</span>
          <div className={styles.rating}>
            {'★'.repeat(Math.round(product.rating))}{'☆'.repeat(5 - Math.round(product.rating))}
            <span className={styles.ratingCount}>({product.rating_count})</span>
          </div>
        </div>
        <div className={styles.stockInfo}>
          {product.stock > 0 ? (
            <span className={styles.inStock}>В наличии: {product.stock} шт.</span>
          ) : (
            <span className={styles.outOfStock}>Нет в наличии</span>
          )}
        </div>
        <div 
          className={styles.productClickArea}
          onClick={() => navigate(`/product/${product.id}`)}
        />
      </div>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;