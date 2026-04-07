import { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './Home.module.css';

const Home = () => {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);

  const features = [
    {
      number: '01',
      title: 'Оригинальная продукция',
      description: 'Сертифицированная электротехника и комплектующие напрямую от мировых производителей. Без подделок, только официальные поставки.'
    },
    {
      number: '02',
      title: 'Собственный склад',
      description: 'Более 10 000 наименований товара всегда в наличии. Кабель, автоматика, щиты, освещение и всё необходимое для монтажа.'
    },
    {
      number: '03',
      title: 'Честные цены',
      description: 'Прямые контракты с производителями без посредников. Мы держим оптимальные цены на рынке, без искусственных наценок и завышений.'
    }
  ];

  //  ТУТ ФОТОГРАФИИ ДЛЯ ПРЕВЬЮ ГАЛЕРЕИ
  const previewImages = [
    '/images/gallery/красивыеСчетчики.jpg',  // ← БОЛЬШАЯ ГЛАВНАЯ ФОТО
    '/images/gallery/кабельныеНаконечники.jpg',  // ← ПЕРВАЯ МАЛЕНЬКАЯ СПРАВА
    '/images/gallery/отрезныеДиски.jpg'   // ← ВТОРАЯ МАЛЕНЬКАЯ СПРАВА
  ];

  //  ТУТ ВСЕ ОСТАЛЬНЫЕ ФОТОГРАФИИ ДЛЯ РАСКРЫТОЙ ГАЛЕРЕИ
  const galleryImages = [
    '/images/gallery/ассортимент1.jpg',
    '/images/gallery/ассортимент2.jpg',
    '/images/gallery/ассортимент3.jpg',
    '/images/gallery/ассортимент4.jpg',
    '/images/gallery/ассортимент5.jpg',
    '/images/gallery/ассортимент7.jpg',
    '/images/gallery/ассортимент8.jpg',
    '/images/gallery/ассортимент9.jpg',
    '/images/gallery/ассортимент12.jpg',
    '/images/gallery/ассортимент14.jpg'
  ];

  return (
    <div className={styles.homeContainer}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Надёжная электротехника</h1>
          <p className={styles.heroSubtitle}>
            Кабель, автоматика, освещение и комплектующие для электромонтажных работ
          </p>
          <Link to="/catalog" className={styles.heroBtn}>
            Перейти в каталог
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className={styles.section}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Почему выбирают нас</h2>
          <div className={styles.featuresGrid}>
            {features.map((feature, index) => (
              <div key={index} className={styles.featureCard}>
                <div className={styles.featureNumber}>{feature.number}</div>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureText}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section className={styles.sectionGray}>
        <div className={styles.container}>
          <div className={styles.aboutGrid}>
            <div className={styles.aboutImage}>
              <img src="/images/gallery/вход.jpg" alt="О компании" />
            </div>
            <div className={styles.aboutContent}>
              <h2 className={styles.sectionTitle}>Немного о нашей работе !</h2>
              <p className={styles.aboutText}>
                Мы работаем на рынке электротехники много лет. Ставим надёжность и репутацию выше всего. Наш магазин "Электрика" сотрудничает с монтажными организациями, строительными компаниями и частными мастерами по всей стране.
              </p>
              <p className={styles.aboutText}>
                На складе постоянно поддерживается широкий ассортимент товара. Прямые контракты с производителями и отлаженная логистика позволяют нам гарантировать стабильные цены и оперативную отгрузку.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className={styles.section}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Примеры нашего ассортимента</h2>

          <div className={`${styles.galleryPreview} ${galleryOpen ? styles.galleryPreviewOpen : ''}`}>
            <div className={styles.galleryMain} onClick={() => galleryOpen ? (() => { setCurrentImage(0); setLightboxOpen(true); })() : setGalleryOpen(true)}>
              <img src={previewImages[0]} alt="Наш склад" />
              <div className={styles.galleryOverlay}>
                <span className={styles.galleryBtn}>Открыть все фото</span>
              </div>
            </div>
            <div className={styles.gallerySide}>
              <div className={styles.gallerySmall} onClick={() => galleryOpen ? (() => { setCurrentImage(1); setLightboxOpen(true); })() : setGalleryOpen(true)}>
                <img src={previewImages[1]} alt="Наш склад" />
              </div>
              <div className={styles.gallerySmall} onClick={() => galleryOpen ? (() => { setCurrentImage(2); setLightboxOpen(true); })() : setGalleryOpen(true)}>
                <img src={previewImages[2]} alt="Наш склад" />
                <div className={styles.galleryCount}>
                  +{galleryImages.length - 3} фото
                </div>
              </div>
            </div>
          </div>

          <div className={`${styles.galleryFull} ${galleryOpen ? styles.galleryOpen : ''}`}>
            {galleryImages.map((image, index) => (
              <div
                key={index}
                className={`${styles.galleryItem} ${(index === 0 || index === 5) ? styles.galleryLarge : ''}`}
                style={{ animationDelay: `${index * 0.08}s` }}
                onClick={() => { setCurrentImage(index + 3); setLightboxOpen(true); }}
              >
                <img src={image} alt={`Ассортимент ${index + 1}`} />
              </div>
            ))}
          </div>

          {galleryOpen && (
            <button
              className={styles.galleryClose}
              onClick={() => setGalleryOpen(false)}
            >
              Скрыть галерею
            </button>
          )}

          {/* Lightbox модалка */}
          {lightboxOpen && (
            <div className={styles.lightbox} onClick={() => setLightboxOpen(false)}>
              <button
                className={`${styles.lightboxBtn} ${styles.lightboxPrev}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImage(prev => prev === 0 ? [...previewImages, ...galleryImages].length - 1 : prev - 1);
                }}
              >
                ←
              </button>

              <div className={styles.lightboxImage} onClick={(e) => e.stopPropagation()}>
                <img src={[...previewImages, ...galleryImages][currentImage]} alt={`Ассортимент ${currentImage + 1}`} />
                <div className={styles.lightboxCounter}>
                  {currentImage + 1} / {[...previewImages, ...galleryImages].length}
                </div>
              </div>

              <button
                className={`${styles.lightboxBtn} ${styles.lightboxNext}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImage(prev => prev === [...previewImages, ...galleryImages].length - 1 ? 0 : prev + 1);
                }}
              >
                →
              </button>

              <button
                className={styles.lightboxClose}
                onClick={() => setLightboxOpen(false)}
              >
                ✕
              </button>
            </div>
          )}

        </div>
      </section>

      {/* CTA */}
      <section className={styles.sectionSmall}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: '24px', fontSize: '1.6rem' }}>Нужна помощь с выбором?</h2>
          
          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <p className={styles.aboutText} style={{ marginBottom: '28px' }}>Затрудняетесь с подбором или не нашли нужный товар? Напишите нам — мы проконсультируем бесплатно.</p>
            <Link to="/requests" className={styles.heroBtn}>
              Связаться с нами
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;
