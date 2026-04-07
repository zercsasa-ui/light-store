import RequestForm from '../components/RequestForm';
import { YMaps, Map, Placemark } from '@pbe/react-yandex-maps';
import styles from './Contacts.module.css';

const Contacts = () => {
  // Координаты: г.Оренбург, ул.Степана Разина, 182 [широта, долгота]
  const mapState = {
    center: [51.778988,55.114769],
    zoom: 16
  };

  return (
    <YMaps query={{ apikey: '88499545-0c13-4377-81ce-dafd2e593d16' }}>
      <div className={styles.contactsContainer}>
        <h1 className={styles.title}>Контакты</h1>
        
        <div className={styles.topRow}>
          <div className={styles.infoSection}>
            <h2>Свяжитесь с нами</h2>
            <div className={styles.contactItem}>
              <img src="/images/ico/icoPhone.png" alt="Телефон" className={styles.contactIcon} />
              <div>
                <strong>Телефон</strong>
                <p><a href="tel:+79228629284">8 (922) 862-92-84</a></p>
              </div>
            </div>
            <div className={styles.contactItem}>
              <img src="/images/ico/icoMail.png" alt="Email" className={styles.contactIcon} />
              <div>
                <strong>Email</strong>
                <p>info@lightstore.ru</p>
              </div>
            </div>
            <div className={styles.contactItem}>
              <img src="/images/ico/icoAdress.png" alt="Адрес" className={styles.contactIcon} />
              <div>
                <strong>Адрес</strong>
                <p>г. Оренбург, ул. Степана Разина, д. 182</p>
              </div>
            </div>
            <div className={styles.contactItem}>
              <img src="/images/ico/icoClock.png" alt="Режим работы" className={styles.contactIcon} />
              <div>
                <strong>Режим работы</strong>
                <p>Пн-Пт: 9:00 - 18:00</p>
              </div>
            </div>
          </div>

          <div className={styles.formSection}>
            <h2>Оставить заявку</h2>
            <RequestForm />
          </div>
        </div>

        <div className={styles.mapSection}>
          <h2>Мы на карте</h2>
          <div className={styles.mapContainer}>
            <Map
              state={mapState}
              width="100%"
              height="400px"
              modules={['geocode', 'templateLayoutFactory']}
            >
              <Placemark
                geometry={[51.778988, 55.114769]}
                properties={{
                  iconCaption: 'Магазин Электрика'
                }}
                options={{
                  preset: 'islands#blueIcon',
                  iconColor: '#0d6efd',
                  interactive: false
                }}
              />
            </Map>
          </div>
        </div>
      </div>
    </YMaps>
  );
};

export default Contacts;