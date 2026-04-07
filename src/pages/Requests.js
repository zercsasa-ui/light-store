import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import RequestForm from '../components/RequestForm';
import styles from './Requests.module.css';

const Requests = () => {
  const [requests, setRequests] = useState([]);
  const [expandedMessages, setExpandedMessages] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const product = location.state?.product;
  const [confirmCancel, setConfirmCancel] = useState(null);

  // Поиск и фильтры
  const [searchQuery, setSearchQuery] = useState('');
  const [searchConfirmedQuery, setSearchConfirmedQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const handleCancelRequest = async (requestId) => {
    try {
      const { error } = await supabase
        .from('requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId);

      if (error) throw error;
      
      const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('requests')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          setRequests(data || []);
        } catch (error) {
          console.error('Error fetching requests:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    } catch (error) {
      console.error('Error cancelling request:', error);
      alert('Ошибка при отмене заявки');
    } finally {
      setConfirmCancel(null);
    }
  };


  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('requests')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setRequests(data || []);
      } catch (error) {
        console.error('Error fetching requests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  useEffect(() => {
    if (product) {
      setMessage(`Интересует товар: ${product.name}\nЦена: ${product.price} ₽`);
    }
  }, [product]);


  const getStatusText = (status) => {
    const statusMap = {
      pending: 'Ожидает обработки',
      in_progress: 'В работе',
      completed: 'Выполнена',
      rejected: 'Отклонена',
      cancelled: 'Отменена'
    };
    return statusMap[status] || status;
  };

  const getStatusClass = (status) => {
    const classMap = {
      pending: styles.statusPending,
      in_progress: styles.statusInProgress,
      completed: styles.statusCompleted,
      rejected: styles.statusRejected,
      cancelled: styles.statusCancelled
    };
    return classMap[status] || '';
  };

  // Фильтрация заявок
  const filteredRequests = requests.filter(req => {
    const matchesSearch =
      req.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.phone.includes(searchQuery);

    let matchesDate = true;
    if (dateFrom) {
      matchesDate = matchesDate && new Date(req.created_at) >= new Date(dateFrom);
    }
    if (dateTo) {
      matchesDate = matchesDate && new Date(req.created_at) <= new Date(dateTo + 'T23:59:59');
    }

    const matchesStatus = selectedStatus === 'all' || req.status === selectedStatus;

    return matchesSearch && matchesDate && matchesStatus;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setSelectedStatus('all');
  };

  return (
    <div className={styles.requestsContainer}>
      <h1 className={styles.title}>Мои заявки</h1>

      <div className={styles.content}>
        <div className={styles.leftColumn}>
          <div className={styles.formSection}>
            <h2 className={styles.formTitle}>Новая заявка</h2>
            <RequestForm
              initialMessage={message}
              onSuccess={() => {
                const fetchData = async () => {
                  if (!user) return;
                  setLoading(true);
                  try {
                    const { data, error } = await supabase
                      .from('requests')
                      .select('*')
                      .eq('user_id', user.id)
                      .order('created_at', { ascending: false });
                    
                    if (error) throw error;
                    setRequests(data || []);
                  } catch (error) {
                    console.error('Error fetching requests:', error);
                  } finally {
                    setLoading(false);
                  }
                };

                fetchData();
              }}
            />
          </div>

          <div className={styles.confirmedSection}>
            <h3 className={styles.confirmedTitle}>Заявки с ответом</h3>
            <div className={styles.confirmedCount}>
              Всего обработано: <strong>{requests.filter(r => r.admin_response).length}</strong>
            </div>

            <input
              type="text"
              placeholder="Поиск..."
              value={searchConfirmedQuery}
              onChange={(e) => setSearchConfirmedQuery(e.target.value)}
              className={styles.smallSearch}
            />

            <div className={styles.confirmedList}>
              {requests.filter(r =>
                r.admin_response &&
                (
                  r.message.toLowerCase().includes(searchConfirmedQuery.toLowerCase()) ||
                  r.phone.includes(searchConfirmedQuery) ||
                  r.admin_response.toLowerCase().includes(searchConfirmedQuery.toLowerCase())
                )
              ).slice(0, 5).map(req => (
                <div key={req.id} className={styles.confirmedItem}>
                  <div className={styles.confirmedItemHeader}>
                    <span>{new Date(req.created_at).toLocaleDateString('ru-RU')}</span>
                    <span className={`${styles.status} ${getStatusClass(req.status)}`}>
                      {getStatusText(req.status)}
                    </span>
                  </div>
                  <p className={styles.confirmedItemText}>{req.message}</p>
                  <div className={styles.adminResponse}>
                    <strong>Ответ:</strong>
                    <p>{req.admin_response}</p>
                  </div>
                </div>
              ))}

              {requests.filter(r =>
                r.admin_response &&
                (
                  r.message.toLowerCase().includes(searchConfirmedQuery.toLowerCase()) ||
                  r.phone.includes(searchConfirmedQuery) ||
                  r.admin_response.toLowerCase().includes(searchConfirmedQuery.toLowerCase())
                )
              ).length === 0 && (
                  <p className={styles.emptySmall}>Пока нет заявок с ответом</p>
                )}
            </div>
          </div>
        </div>

        <div className={styles.requestsList}>
          <h2 className={styles.listTitle}>История заявок</h2>

          {/* Поиск и фильтры */}
          <div className={styles.filtersBar}>
            <input
              type="text"
              placeholder="Поиск по заявкам..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />

            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={styles.dateInput}
            />

            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={styles.dateInput}
            />

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className={styles.statusFilter}
            >
              <option value="all">Все статусы</option>
              <option value="pending">Ожидают</option>
              <option value="in_progress">В работе</option>
              <option value="completed">Выполнено</option>
              <option value="rejected">Отклонено</option>
              <option value="cancelled">Отменено</option>
            </select>

            <button onClick={clearFilters} className={styles.clearFiltersBtn}>
              Сбросить
            </button>
          </div>

          {loading ? (
            <p className={styles.loading}>Загрузка...</p>
          ) : filteredRequests.length === 0 ? (
            <p className={styles.empty}>Нет заявок по выбранным фильтрам</p>
          ) : (
            <div className={styles.requests}>
              {filteredRequests.map(req => (
                <div key={req.id} className={styles.requestCard}>
                  <div className={styles.requestHeader}>
                    <span className={styles.requestDate}>
                      {new Date(req.created_at).toLocaleDateString('ru-RU')}
                    </span>
                    <span className={`${styles.status} ${getStatusClass(req.status)}`}>
                      {getStatusText(req.status)}
                    </span>
                  </div>
                  <p className={styles.requestMessage}>
                    {expandedMessages[req.id] 
                      ? req.message
                      : (req.message.length > 100 
                          ? req.message.substring(0, 100) + '...' 
                          : req.message)}
                  </p>
                  {req.message.length > 100 && (
                    <button 
                      className={styles.expandBtn}
                      onClick={() => setExpandedMessages(prev => ({
                        ...prev,
                        [req.id]: !prev[req.id]
                      }))}
                    >
                      {expandedMessages[req.id] ? 'Свернуть' : 'Читать далее...'}
                    </button>
                  )}
                  <p className={styles.requestPhone}>Телефон: {req.phone}</p>
                  {req.admin_response && (
                    <div className={styles.adminResponse}>
                      <strong>Ответ администратора:</strong>
                      <p>{req.admin_response}</p>
                    </div>
                  )}

                  {req.status === 'pending' && confirmCancel === req.id ? (
                    <div className={styles.cancelConfirm}>
                      <p>Вы действительно хотите отменить эту заявку?</p>
                      <div className={styles.cancelActions}>
                        <button
                          className={styles.confirmCancelBtn}
                          onClick={() => handleCancelRequest(req.id)}
                        >
                          Да, отменить
                        </button>
                        <button
                          className={styles.cancelBtn}
                          onClick={() => setConfirmCancel(null)}
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  ) : req.status === 'pending' && (
                    <button
                      className={styles.cancelRequestBtn}
                      onClick={() => setConfirmCancel(req.id)}
                    >
                      Отменить заявку
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>


    </div>
  );
};

export default Requests;