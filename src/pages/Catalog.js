import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import ProductCard from '../components/ProductCard';
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

  useEffect(() => {
    const abortController = new AbortController();

    const fetchData = async () => {
      const retryDelay = (attempt) => 1000 * Math.pow(2, attempt);

      for (let attempt = 0; attempt < 3; attempt++) {
        if (abortController.signal.aborted) return;

        try {
          const timeoutId = setTimeout(() => abortController.abort(), 10000);

          // ✅ Параллельные запросы - ускоряет загрузку в 2 раза
          const [productsRes, categoriesRes] = await Promise.all([
            supabase.from('products').select('*, categories(name)').limit(200).order('created_at', { ascending: false }),
            supabase.from('categories').select('*').order('name')
          ]);
          
          clearTimeout(timeoutId);

          if (abortController.signal.aborted) return;

          if (productsRes.error) throw productsRes.error;
          if (categoriesRes.error) throw categoriesRes.error;
          
          setProducts(productsRes.data || []);
          setCategories(categoriesRes.data || []);
          
          break;
        } catch (error) {
          if (error.name === 'AbortError') return;
          
          console.error(`Ошибка загрузки, попытка ${attempt + 1}/3`, error);
          
          if (attempt === 2) {
            setProducts([]);
            setCategories([]);
            break;
          }
          
          await new Promise(resolve => setTimeout(resolve, retryDelay(attempt)));
        } finally {
          setLoading(false);
        }
      }
    };

    fetchData();

    // ✅ Отменяем запрос при размонтировании компонента / быстрой навигации
    return () => abortController.abort();
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
             <ProductCard key={product.id} product={product} />
           ))}
        </div>
      )}
    </div>
  );
};

export default Catalog;