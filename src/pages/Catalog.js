import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import styles from './Catalog.module.css';

const Catalog = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*, categories(name)');
        
        if (productsError) throw productsError;
        setProducts(productsData || []);

        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*');
        
        if (categoriesError) throw categoriesError;
        setCategories(categoriesData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  let filteredProducts = products;

  // Фильтр по категории
  if (selectedCategory) {
    filteredProducts = filteredProducts.filter(p => p.categories?.name === selectedCategory);
  }

  // Поиск по названию
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filteredProducts = filteredProducts.filter(p => 
      p.name?.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query)
    );
  }

  // Фильтр по минимальной цене
  if (minPrice) {
    filteredProducts = filteredProducts.filter(p => p.price >= parseFloat(minPrice));
  }

  // Фильтр по максимальной цене
  if (maxPrice) {
    filteredProducts = filteredProducts.filter(p => p.price <= parseFloat(maxPrice));
  }

  // Фильтр по минимальной оценке
  if (minRating > 0) {
    filteredProducts = filteredProducts.filter(p => (p.rating || 0) >= minRating);
  }

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.catalogContainer}>
      <h1 className={styles.title}>Каталог товаров</h1>
      
      <div className={styles.searchAndFilters}>
        <div className={styles.searchWrapper}>
          <img src="/images/ico/icoLupa.png" alt="Поиск" className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Поиск товара..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        
        <div className={styles.filtersRow}>
          <div className={styles.priceFilter}>
            <input
              type="number"
              placeholder="Цена от"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className={styles.priceInput}
              min="0"
            />
            <span className={styles.priceDivider}>—</span>
            <input
              type="number"
              placeholder="Цена до"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className={styles.priceInput}
              min="0"
            />
          </div>

          <div className={styles.ratingFilter}>
            <span>Мин. оценка:</span>
            <div className={styles.ratingStars}>
              {[1,2,3,4,5].map(rating => (
                <span 
                  key={rating}
                  className={minRating >= rating ? styles.starActive : styles.star}
                  onClick={() => setMinRating(minRating === rating ? 0 : rating)}
                >
                  ★
                </span>
              ))}
            </div>
          </div>

          <span className={styles.productsCount}>Найдено: {filteredProducts.length}</span>
        </div>
      </div>

      <div className={styles.categories}>
        <button 
          className={`${styles.categoryBtn} ${!selectedCategory ? styles.active : ''}`}
          onClick={() => setSelectedCategory(null)}
        >
          Все
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`${styles.categoryBtn} ${selectedCategory === cat.name ? styles.active : ''}`}
            onClick={() => setSelectedCategory(cat.name)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {filteredProducts.length === 0 ? (
        <p className={styles.empty}>Товары не найдены</p>
      ) : (
        <div className={styles.productsGrid}>
          {filteredProducts.map(product => (
            <div key={product.id} className={styles.productCard}>
              <div className={styles.imageContainer}>
                <img 
                  src={product.image_url || 'https://via.placeholder.com/300x200'} 
                  alt={product.name}
                  className={styles.productImage}
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
          ))}
        </div>
      )}
    </div>
  );
};

export default Catalog;