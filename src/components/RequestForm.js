import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import styles from './RequestForm.module.css';

const RequestForm = ({ initialMessage = '', onSuccess }) => {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState(initialMessage);

  // Обновляем поле сообщения когда меняется initialMessage из пропсов
  useEffect(() => {
    setMessage(initialMessage);
  }, [initialMessage]);
  const [loading, setLoading] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [phoneError, setPhoneError] = useState('');
  const maxMessageLength = 300;

  // Валидация номера телефона (проверяем длину после очистки)
  const validatePhone = (phoneNumber) => {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    // Минимум 10 цифр для валидного номера
    return cleanNumber.length >= 10;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (!validatePhone(phone)) {
      setPhoneError('Введите корректный номер телефона');
      return;
    }

    if (!phone || !message) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('requests')
        .insert({
          user_id: user.id,
          phone,
          message,
          status: 'pending'
        });
      
      if (error) throw error;
      
      setPhone('');
      setMessage('');
      setSuccessModal(true);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Ошибка при отправке заявки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!user ? (
        <div className={styles.loginPrompt}>
          <p>Для отправки заявки необходимо <button onClick={() => navigate('/auth')}>войти</button></p>
        </div>
      ) : (
        <form className={styles.requestForm} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Телефон для связи *</label>
            <PhoneInput
              country={'ru'}
              value={phone}
              onChange={(phone) => {
                setPhone('+' + phone);
                setPhoneError('');
              }}
              inputClass={styles.phoneInput}
              containerClass={styles.phoneInputContainer}
              buttonClass={styles.phoneInputButton}
              placeholder="+7 (999) 123-45-67"
              enableSearch={true}
              searchPlaceholder="Поиск страны..."
              localization={{ ru: 'Россия' }}
              preferredCountries={['ru', 'kz', 'by', 'ua']}
            />
            {phoneError && <span className={styles.errorText}>{phoneError}</span>}
          </div>
          
          <div className={styles.formGroup}>
            <div className={styles.textareaHeader}>
              <label htmlFor="message">Сообщение *</label>
              <span className={styles.charCount}>{message.length}/{maxMessageLength}</span>
            </div>
            <textarea
              id="message"
              value={message}
              onChange={(e) => {
                if (e.target.value.length <= maxMessageLength) {
                  setMessage(e.target.value);
                }
              }}
              placeholder="Опишите, что вам нужно..."
              rows={4}
              maxLength={maxMessageLength}
              required
            />
          </div>
          
          <button 
            type="submit" 
            className={styles.submitBtn}
            disabled={loading || !phone || !message}
          >
            {loading ? 'Отправка...' : 'Отправить заявку'}
          </button>
        </form>
      )}

      {/* Модальное окно успешной отправки */}
      {successModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.successIcon}>✓</div>
            <h3 className={styles.modalTitle}>Заявка успешно отправлена!</h3>
            <p className={styles.modalMessage}>
              Мы получили вашу заявку. В ближайшее время с вами свяжется наш менеджер для уточнения деталей.
            </p>
            <button 
              className={styles.modalCloseBtn}
              onClick={() => setSuccessModal(false)}
            >
              Хорошо
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default RequestForm;