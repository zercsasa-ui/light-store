import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import styles from './Admin.module.css';
import ConfirmModal from '../components/ConfirmModal';

const Admin = () => {
  const [expandedMessages, setExpandedMessages] = useState({});
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const [activeTab, setActiveTab] = useState('requests');
  const [requests, setRequests] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRequest, setEditingRequest] = useState(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [requestStatus, setRequestStatus] = useState('');
  const [showProductForm, setShowProductForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ name: '', email: '', role: '' });

  // Состояния для вопросов о товарах
  const [questions, setQuestions] = useState([]);
  const [questionSearch, setQuestionSearch] = useState('');
  const [questionStatusFilter, setQuestionStatusFilter] = useState('');
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [answerText, setAnswerText] = useState('');
  const [hoveredProduct, setHoveredProduct] = useState(null);

  // Состояния для обрезки изображений
  const [showCropper, setShowCropper] = useState(false);
  const [originalImage, setOriginalImage] = useState(null);
  const [cropSelection, setCropSelection] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  // Фиксированные размеры для всех фотографий товаров
  const TARGET_ASPECT_RATIO = 3 / 4; // 3:4 соотношение (стандарт для карточек товаров)
  const FINAL_IMAGE_WIDTH = 600;
  const FINAL_IMAGE_HEIGHT = 800;
  const [globalViewMode, setGlobalViewMode] = useState('list'); // list / grid
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    image_url: '',
    category_id: '',
    stock: '',
    is_active: true
  });
  const { user, userProfile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortStatus, setSortStatus] = useState('');
  const [sortDate, setSortDate] = useState('desc');
  const [requestDateFrom, setRequestDateFrom] = useState('');
  const [requestDateTo, setRequestDateTo] = useState('');

  // Фильтры для товаров
  const [productSearch, setProductSearch] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [productActive, setProductActive] = useState('');
  const [productDateFrom, setProductDateFrom] = useState('');
  const [productDateTo, setProductDateTo] = useState('');

  // Состояния для категорий
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [categorySearch, setCategorySearch] = useState('');

  // Обработка категорий
  let processedCategories = categories.filter(cat => {
    if (!categorySearch.trim()) return true;
    const query = categorySearch.toLowerCase();
    return (
      cat.name?.toLowerCase().includes(query) ||
      cat.description?.toLowerCase().includes(query)
    );
  });

  // Состояние для поиска пользователей
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');

  // Обработка пользователей
  let processedUsers = users.filter(user => {
    if (!userSearch.trim()) return true;
    const query = userSearch.toLowerCase();
    return (
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    );
  });

  // Фильтр по роли
  if (userRoleFilter) {
    processedUsers = processedUsers.filter(user => user.role === userRoleFilter);
  }

  // Сортировка товаров
  const [productSortDate, setProductSortDate] = useState('desc');

  // Обработка товаров
  let processedProducts = products.filter(prod => {
    if (productSearch.trim()) {
      const query = productSearch.toLowerCase();
      if (
        !prod.name?.toLowerCase().includes(query) &&
        !prod.description?.toLowerCase().includes(query)
      ) return false;
    }

    if (productCategory && prod.category_id !== parseInt(productCategory)) {
      return false;
    }

    if (productActive === 'active' && !prod.is_active) return false;
    if (productActive === 'inactive' && prod.is_active) return false;

    // Фильтр по дате создания товаров
    if (productDateFrom) {
      const fromDate = new Date(productDateFrom);
      fromDate.setHours(0, 0, 0, 0);
      if (new Date(prod.created_at) < fromDate) return false;
    }
    if (productDateTo) {
      const toDate = new Date(productDateTo);
      toDate.setHours(23, 59, 59, 999);
      if (new Date(prod.created_at) > toDate) return false;
    }

    return true;
  });

  // Сортировка товаров по дате
  processedProducts = [...processedProducts].sort((a, b) => {
    const dateA = new Date(a.created_at);
    const dateB = new Date(b.created_at);
    return productSortDate === 'desc' ? dateB - dateA : dateA - dateB;
  });

  // Восстановление состояния из localStorage при загрузке
  useEffect(() => {
    if (userProfile?.role === 'admin' || userProfile?.role === 'manager') {
      const savedTab = localStorage.getItem('admin_last_tab');
      const savedViewMode = localStorage.getItem('admin_view_mode');

      if (savedTab) setActiveTab(savedTab);
      if (savedViewMode) setGlobalViewMode(savedViewMode);

      fetchData();
    }
  }, [userProfile]);

  // Сохранение активной вкладки в localStorage
  useEffect(() => {
    if (userProfile?.role === 'admin' || userProfile?.role === 'manager') {
      localStorage.setItem('admin_last_tab', activeTab);
    }
  }, [activeTab, userProfile]);

  // Сохранение режима отображения в localStorage
  useEffect(() => {
    if (userProfile?.role === 'admin' || userProfile?.role === 'manager') {
      localStorage.setItem('admin_view_mode', globalViewMode);
    }
  }, [globalViewMode, userProfile]);

  let processedRequests = requests.filter(req => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    if (
      !req.profiles?.name?.toLowerCase().includes(query) &&
      !req.profiles?.email?.toLowerCase().includes(query) &&
      !req.phone?.toLowerCase().includes(query) &&
      !req.message?.toLowerCase().includes(query)
    ) return false;

    // Сортировка по статусу
    if (sortStatus && req.status !== sortStatus) {
      return false;
    }

    // Фильтр по дате создания заявок
    if (requestDateFrom) {
      const fromDate = new Date(requestDateFrom);
      fromDate.setHours(0, 0, 0, 0);
      if (new Date(req.created_at) < fromDate) return false;
    }
    if (requestDateTo) {
      const toDate = new Date(requestDateTo);
      toDate.setHours(23, 59, 59, 999);
      if (new Date(req.created_at) > toDate) return false;
    }

    return true;
  });

  // Сортировка по дате
  processedRequests = [...processedRequests].sort((a, b) => {
    const dateA = new Date(a.created_at);
    const dateB = new Date(b.created_at);
    return sortDate === 'desc' ? dateB - dateA : dateA - dateB;
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: reqData } = await supabase
        .from('requests')
        .select('*, profiles(name, email)')
        .order('created_at', { ascending: false });

      const { data: prodData } = await supabase
        .from('products')
        .select('*, categories(name)');

      const { data: catData } = await supabase
        .from('categories')
        .select('*');

      const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: questionsData } = await supabase
        .from('product_questions')
        .select(`
          *,
          products(name, id),
          product_answers(*)
        `)
        .order('created_at', { ascending: false });

      setRequests(reqData || []);
      setProducts(prodData || []);
      setCategories(catData || []);
      setUsers(usersData || []);
      setQuestions(questionsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const [originalUser, setOriginalUser] = useState(null);

  const handleEditUser = (user) => {
    setEditingUser(user.id);
    const originalData = { name: user.name || '', email: user.email || '', role: user.role || 'user' };
    setOriginalUser(originalData);
    setUserForm(originalData);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      // ✅ Используем Edge Function вместо прямого запроса - обходит все проблемы с RLS
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('https://mutebkvjowivxupnexzp.supabase.co/functions/v1/bright-processor', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: editingUser,
          data: userForm
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка сервера');
      }

      showSuccess('Пользователь успешно обновлен!');
      setEditingUser(null);
      setUserForm({ name: '', email: '', role: '' });
      fetchData();
    } catch (error) {
      console.error('Error updating user:', error);
      alert(`Ошибка при обновлении пользователя: ${error.message}`);
    }
  };

  const handleCancelUserEdit = () => {
    setEditingUser(null);
    setUserForm({ name: '', email: '', role: '' });
  };

  const [confirmModal, setConfirmModal] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const getStatusClass = (status) => {
    const classMap = {
      pending: styles.statusPending,
      in_progress: styles.statusInProgress,
      completed: styles.statusCompleted,
      rejected: styles.statusRejected
    };
    return classMap[status] || '';
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Универсальный обработчик открытия модального подтверждения
  const openConfirmModal = (action, item) => {
    setConfirmModal({ action, item });
  };

  // Обработчик подтверждения действия
  const handleConfirmAction = async () => {
    if (!confirmModal) return;

    const { action, item } = confirmModal;

    try {
      switch (action) {
        case 'delete_product':
          await supabase.from('products').delete().eq('id', item.id);
          break;
        case 'delete_request':
          // ✅ Удаление заявки через Edge Function обходит RLS
          const sessionReq = await supabase.auth.getSession();

          await fetch('https://mutebkvjowivxupnexzp.supabase.co/functions/v1/delete-request', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${sessionReq.data.session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ requestId: item.id })
          });
          break;
        case 'delete_user':
          // ✅ Удаление пользователя через Edge Function обходит RLS
          const sessionUser = await supabase.auth.getSession();

          await fetch('https://mutebkvjowivxupnexzp.supabase.co/functions/v1/delete-user', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${sessionUser.data.session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: item.id })
          });
          break;

        case 'delete_question':
          // ✅ Удаление вопроса через Edge Function обходит RLS
          const sessionQuestion = await supabase.auth.getSession();

          const questionResp = await fetch('https://mutebkvjowivxupnexzp.supabase.co/functions/v1/delete-question', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${sessionQuestion.data.session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ questionId: item.id })
          });

          if (!questionResp.ok) {
            const err = await questionResp.json();
            throw new Error(err.error || 'Ошибка удаления вопроса');
          }
          break;
        case 'delete_category':
          await supabase.from('categories').delete().eq('id', item.id);
          break;
        case 'reset_password':
          // ✅ Сброс пароля через Edge Function
          const sessionReset = await supabase.auth.getSession();

          const resetResp = await fetch('https://mutebkvjowivxupnexzp.supabase.co/functions/v1/reset-password', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${sessionReset.data.session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: item.id })
          });

          const resetResult = await resetResp.json();

          if (!resetResp.ok) {
            throw new Error(resetResult.error || 'Ошибка сброса пароля');
          }

          alert(resetResult.message);
          break;
        case 'cancel_edit_product':
          handleCancelEdit();
          break;
        case 'cancel_edit_user':
          handleCancelUserEdit();
          break;
        default:
          break;
      }

      fetchData();
    } catch (error) {
      console.error('Ошибка при выполнении действия:', error);
      alert('Ошибка при выполнении операции');
    } finally {
      setConfirmModal(null);
    }
  };


  const handleUpdateRequest = async (requestId) => {
    try {
      // ✅ Если написан ответ но статус остался Ожидает - автоматически ставим Выполнена
      let finalStatus = requestStatus
      if (adminResponse.trim() && finalStatus === 'pending') {
        finalStatus = 'completed'
      }

      const { error } = await supabase
        .from('requests')
        .update({
          admin_response: adminResponse,
          status: finalStatus
        })
        .eq('id', requestId);

      if (error) throw error;

      setEditingRequest(null);
      setAdminResponse('');
      setRequestStatus('');
      fetchData();
      showSuccess('Статус заявки успешно обновлен!');
    } catch (error) {
      console.error('Error updating request:', error);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Выберите изображение');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Файл слишком большой (макс 5MB)');
      return;
    }

    // Создаем URL для превью и открываем кроппер
    const reader = new FileReader();
    reader.onload = (event) => {
      setOriginalImage(event.target.result);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Обработчик загрузки изображения в кроппере
  const handleCropperImageLoad = (e) => {
    const img = e.target;
    const width = img.offsetWidth;
    const height = img.offsetHeight;

    setImageDimensions({ width, height });

    // Рассчитываем размер рамки выбора по центру с правильным соотношением
    let selectionWidth, selectionHeight;

    if (width / height > TARGET_ASPECT_RATIO) {
      // Изображение шире нужного соотношения - ограничиваем по высоте
      selectionHeight = height * 0.8;
      selectionWidth = selectionHeight * TARGET_ASPECT_RATIO;
    } else {
      // Изображение выше нужного соотношения - ограничиваем по ширине
      selectionWidth = width * 0.8;
      selectionHeight = selectionWidth / TARGET_ASPECT_RATIO;
    }

    setCropSelection({
      x: (width - selectionWidth) / 2,
      y: (height - selectionHeight) / 2,
      width: selectionWidth,
      height: selectionHeight
    });
  };

  // Обработчики для перетаскивания рамки выбора
  const handleCropMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const target = e.target;

    if (target.classList.contains(styles.cropResizeHandle)) {
      setIsResizing(true);
      setResizeHandle(target.dataset.corner);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        selectionX: cropSelection.x,
        selectionY: cropSelection.y,
        selectionWidth: cropSelection.width,
        selectionHeight: cropSelection.height
      });
    } else {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - cropSelection.x,
        y: e.clientY - cropSelection.y
      });
    }
  };

  const handleCropMouseMove = (e) => {
    if (isDragging) {
      let newX = e.clientX - dragStart.x;
      let newY = e.clientY - dragStart.y;

      // Ограничиваем передвижение в пределах изображения
      newX = Math.max(0, Math.min(newX, imageDimensions.width - cropSelection.width));
      newY = Math.max(0, Math.min(newY, imageDimensions.height - cropSelection.height));

      setCropSelection(prev => ({
        ...prev,
        x: newX,
        y: newY
      }));
    }

    if (isResizing) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      // Рассчитываем новую ширину и высоту с сохранением соотношения
      let newWidth = dragStart.selectionWidth;
      let newHeight = dragStart.selectionHeight;
      let newX = dragStart.selectionX;
      let newY = dragStart.selectionY;

      if (resizeHandle === 'br') {
        // Правая нижняя точка
        const scale = Math.min(deltaX / dragStart.selectionWidth, deltaY / dragStart.selectionHeight);
        newWidth = Math.max(100, dragStart.selectionWidth * (1 + scale));
        newHeight = newWidth / TARGET_ASPECT_RATIO;
      } else if (resizeHandle === 'tl') {
        // Левая верхняя точка
        const scale = Math.min(-deltaX / dragStart.selectionWidth, -deltaY / dragStart.selectionHeight);
        newWidth = Math.max(100, dragStart.selectionWidth * (1 + scale));
        newHeight = newWidth / TARGET_ASPECT_RATIO;
        newX = dragStart.selectionX + (dragStart.selectionWidth - newWidth);
        newY = dragStart.selectionY + (dragStart.selectionHeight - newHeight);
      } else if (resizeHandle === 'tr') {
        // Правая верхняя точка
        const scale = Math.min(deltaX / dragStart.selectionWidth, -deltaY / dragStart.selectionHeight);
        newWidth = Math.max(100, dragStart.selectionWidth * (1 + scale));
        newHeight = newWidth / TARGET_ASPECT_RATIO;
        newY = dragStart.selectionY + (dragStart.selectionHeight - newHeight);
      } else if (resizeHandle === 'bl') {
        // Левая нижняя точка
        const scale = Math.min(-deltaX / dragStart.selectionWidth, deltaY / dragStart.selectionHeight);
        newWidth = Math.max(100, dragStart.selectionWidth * (1 + scale));
        newHeight = newWidth / TARGET_ASPECT_RATIO;
        newX = dragStart.selectionX + (dragStart.selectionWidth - newWidth);
      }

      // Ограничиваем размеры в пределах изображения
      // ✅ Абсолютные ограничения рамки в пределах изображения
      if (newX < 0) {
        newWidth += newX;
        newX = 0;
      }
      if (newY < 0) {
        newHeight += newY;
        newY = 0;
      }
      if (newX + newWidth > imageDimensions.width) {
        newWidth = imageDimensions.width - newX;
      }
      if (newY + newHeight > imageDimensions.height) {
        newHeight = imageDimensions.height - newY;
      }

      // Корректировка пропорций после ограничений
      const finalRatio = newWidth / newHeight;
      if (finalRatio > TARGET_ASPECT_RATIO) {
        newWidth = newHeight * TARGET_ASPECT_RATIO;
      } else {
        newHeight = newWidth / TARGET_ASPECT_RATIO;
      }

      // Финальная проверка чтобы точно не вышло за границы
      if (newX + newWidth > imageDimensions.width) {
        newX = imageDimensions.width - newWidth;
      }
      if (newY + newHeight > imageDimensions.height) {
        newY = imageDimensions.height - newHeight;
      }

      // Минимальный размер
      newWidth = Math.max(100, newWidth);
      newHeight = Math.max(133, newHeight);

      setCropSelection({
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight
      });
    }
  };

  const handleCropMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  };

  // Функция обрезки изображения
  const handleCropConfirm = async () => {
    setUploading(true);

    try {
      // Создаем canvas для обрезки
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.src = originalImage;

      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // Рассчитываем коэффициент масштабирования
      const scaleX = img.naturalWidth / imageDimensions.width;
      const scaleY = img.naturalHeight / imageDimensions.height;

      // Устанавливаем финальные размеры
      canvas.width = FINAL_IMAGE_WIDTH;
      canvas.height = FINAL_IMAGE_HEIGHT;

      // Обрезаем и изменяем размер
      ctx.drawImage(
        img,
        cropSelection.x * scaleX,
        cropSelection.y * scaleY,
        cropSelection.width * scaleX,
        cropSelection.height * scaleY,
        0,
        0,
        FINAL_IMAGE_WIDTH,
        FINAL_IMAGE_HEIGHT
      );

      // Конвертируем в blob
      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/webp', 0.9);
      });

      // Загружаем обрезанное изображение
      const fileName = `${Date.now()}.webp`;
      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(fileName);

      setProductForm({ ...productForm, image_url: publicUrl });
      setShowCropper(false);
      setOriginalImage(null);

    } catch (error) {
      console.error('Error cropping image:', error);
      alert('Ошибка при обработке изображения');
    } finally {
      setUploading(false);
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setOriginalImage(null);
    setIsDragging(false);
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('products')
        .insert({
          name: productForm.name,
          description: productForm.description,
          price: parseFloat(productForm.price),
          image_url: productForm.image_url,
          category_id: productForm.category_id ? parseInt(productForm.category_id) : null,
          stock: parseInt(productForm.stock) || 0,
          is_active: productForm.is_active
        });

      if (error) throw error;

      setProductForm({ name: '', description: '', price: '', image_url: '', category_id: '', stock: '', is_active: true });
      setShowProductForm(false);
      fetchData();
    } catch (error) {
      console.error('Error creating product:', error);
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product.id);
    setProductForm({
      name: product.name || '',
      description: product.description || '',
      price: product.price?.toString() || '',
      image_url: product.image_url || '',
      category_id: product.category_id?.toString() || '',
      stock: product.stock?.toString() || '',
      is_active: product.is_active ?? true
    });
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      const { error } = await supabase
        .from('products')
        .update({
          name: productForm.name,
          description: productForm.description,
          price: parseFloat(productForm.price),
          image_url: productForm.image_url,
          category_id: productForm.category_id ? parseInt(productForm.category_id) : null,
          stock: parseInt(productForm.stock) || 0,
          is_active: productForm.is_active
        })
        .eq('id', editingProduct);

      if (error) throw error;

      setEditingProduct(null);
      setProductForm({ name: '', description: '', price: '', image_url: '', category_id: '', stock: '', is_active: true });
      fetchData();
    } catch (error) {
      console.error('Error updating product:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setProductForm({ name: '', description: '', price: '', image_url: '', category_id: '', stock: '', is_active: true });
  };

  // Обработчики категорий
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('categories')
        .insert({
          name: categoryForm.name,
          description: categoryForm.description
        });

      if (error) throw error;

      setCategoryForm({ name: '', description: '' });
      setShowCategoryForm(false);
      fetchData();
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    if (!editingCategory) return;

    try {
      const { error } = await supabase
        .from('categories')
        .update({
          name: categoryForm.name,
          description: categoryForm.description
        })
        .eq('id', editingCategory);

      if (error) throw error;

      setEditingCategory(null);
      setCategoryForm({ name: '', description: '' });
      setShowCategoryForm(false);
      fetchData();
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };


  const getStatusText = (status) => {
    const statusMap = {
      pending: 'Ожидает',
      in_progress: 'В работе',
      completed: 'Выполнена',
      rejected: 'Отклонена'
    };
    return statusMap[status] || status;
  };

  if (userProfile?.role !== 'admin' && userProfile?.role !== 'manager') {
    return <div className={styles.accessDenied}>Доступ только для администраторов и менеджеров</div>;
  }

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.adminContainer}>
      <h1 className={styles.title}>Панель администратора</h1>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'requests' ? styles.active : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          Заявки ({requests.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'products' ? styles.active : ''}`}
          onClick={() => setActiveTab('products')}
        >
          Товары ({products.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'categories' ? styles.active : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          Категории ({categories.length})
        </button>
        {userProfile?.role === 'admin' && (
          <button
            className={`${styles.tab} ${activeTab === 'users' ? styles.active : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Пользователи ({users.length})
          </button>
        )}
        <button
          className={`${styles.tab} ${activeTab === 'questions' ? styles.active : ''}`}
          onClick={() => setActiveTab('questions')}
        >
          Вопросы ({questions.length})
        </button>
      </div>

      {activeTab === 'requests' && (
        <div className={styles.requestsSection}>
          <div className={styles.filtersBar}>
            <div className={styles.searchWrapper}>
              <img src="/images/ico/icoLupa.png" alt="Поиск" className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Поиск по заявкам (имя, почта, телефон, сообщение)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            <select
              value={sortStatus}
              onChange={(e) => setSortStatus(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">Все статусы</option>
              <option value="pending">Ожидает</option>
              <option value="in_progress">В работе</option>
              <option value="completed">Выполнена</option>
              <option value="rejected">Отклонена</option>
            </select>

            <select
              value={sortDate}
              onChange={(e) => setSortDate(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="desc">Сначала новые</option>
              <option value="asc">Сначала старые</option>
            </select>

            <input
              type="date"
              value={requestDateFrom}
              onChange={(e) => setRequestDateFrom(e.target.value)}
              className={styles.dateInput}
              placeholder="От даты"
            />
            <input
              type="date"
              value={requestDateTo}
              onChange={(e) => setRequestDateTo(e.target.value)}
              className={styles.dateInput}
              placeholder="До даты"
            />

            <span className={styles.searchCount}>Всего: {processedRequests.length}</span>

            <button
              onClick={() => setGlobalViewMode(globalViewMode === 'list' ? 'grid' : 'list')}
              className={styles.viewToggleBtn}
            >
              <img src="/images/ico/icoMain.png" alt="Вид" className={styles.viewIcon} />
            </button>
          </div>

          {processedRequests.length === 0 ? (
            <p className={styles.empty}>Заявок пока нет</p>
          ) : (
            <div className={`${styles.requestsList} ${globalViewMode === 'grid' ? styles.requestsGrid : ''}`}>
              {processedRequests.map(req => (
                <div key={req.id} className={styles.requestCard}>
                  <div className={styles.requestLeft}>
                    <div className={styles.requestHeader}>
                      <div>
                        <strong>{req.profiles?.name}</strong>
                        <span className={styles.requestEmail}>{req.profiles?.email}</span>
                      </div>
                      <span className={styles.requestDate}>
                        {new Date(req.created_at).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                    <p className={styles.requestPhone}>Телефон: {req.phone}</p>
                    <div className={styles.messageWrapper}>
                      <p className={styles.requestMessage}>
                        {expandedMessages[req.id]
                          ? req.message
                          : (req.message.length > 25
                            ? req.message.substring(0, 25) + '...'
                            : req.message)}
                      </p>
                      {req.message.length > 25 && (
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
                    </div>
                  </div>
                  <div className={styles.requestRight}>
                    <div className={styles.requestStatus}>
                      <span className={`${styles.status} ${getStatusClass(req.status)}`}>{getStatusText(req.status)}</span>
                    </div>
                    <div className={styles.requestActions}>
                      {editingRequest !== req.id ? (
                        <>
                          <button
                            className={styles.editBtn}
                            onClick={() => {
                              setEditingRequest(req.id);
                              setAdminResponse(req.admin_response || '');
                              setRequestStatus(req.status);
                            }}
                          >
                            Ответить
                          </button>
                          <button
                            className={styles.deleteBtn}
                            onClick={() => openConfirmModal('delete_request', req)}
                          >
                            Удалить
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                  {editingRequest === req.id && (
                    <div className={styles.editForm}>
                      <textarea
                        value={adminResponse}
                        onChange={(e) => setAdminResponse(e.target.value)}
                        placeholder="Ответ администратора..."
                        rows={3}
                        maxLength={500}
                      />
                      <select
                        value={requestStatus}
                        onChange={(e) => setRequestStatus(e.target.value)}
                      >
                        <option value="pending">Ожидает</option>
                        <option value="in_progress">В работе</option>
                        <option value="completed">Выполнена</option>
                        <option value="rejected">Отклонена</option>
                      </select>
                      <div className={styles.editActions}>
                        <button onClick={() => handleUpdateRequest(req.id)}>Сохранить</button>
                        <button onClick={() => setEditingRequest(null)}>Отмена</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'products' && (
        <div className={styles.productsSection}>
          <div className={styles.filtersBar}>
            <div className={styles.searchWrapper}>
              <img src="/images/ico/icoLupa.png" alt="Поиск" className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Поиск по названию и описанию..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            <select
              value={productCategory}
              onChange={(e) => setProductCategory(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">Все категории</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>

            <select
              value={productActive}
              onChange={(e) => setProductActive(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">Все товары</option>
              <option value="active">Активные</option>
              <option value="inactive">Неактивные</option>
            </select>

            <select
              value={productSortDate}
              onChange={(e) => setProductSortDate(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="desc">Сначала новые</option>
              <option value="asc">Сначала старые</option>
            </select>

            <input
              type="date"
              value={productDateFrom}
              onChange={(e) => setProductDateFrom(e.target.value)}
              className={styles.dateInput}
              placeholder="От даты"
            />
            <input
              type="date"
              value={productDateTo}
              onChange={(e) => setProductDateTo(e.target.value)}
              className={styles.dateInput}
              placeholder="До даты"
            />

            <span className={styles.searchCount}>Всего: {processedProducts.length}</span>

            <button
              onClick={() => setGlobalViewMode(globalViewMode === 'list' ? 'grid' : 'list')}
              className={styles.viewToggleBtn}
            >
              <img src="/images/ico/icoMain.png" alt="Вид" className={styles.viewIcon} />
            </button>

            <button
              className={styles.addBtn}
              onClick={() => {
                setShowProductForm(!showProductForm);
                setEditingProduct(null);
              }}
            >
              {showProductForm ? 'Отмена' : '+ Добавить товар'}
            </button>
          </div>

          {(showProductForm || editingProduct) && (
            <form className={styles.productForm} onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct}>
              <h3>{editingProduct ? 'Редактирование товара' : 'Новый товар'}</h3>
              <div className={styles.formRow}>
                <input
                  type="text"
                  placeholder="Название"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  required
                />
                <input
                  type="number"
                  placeholder="Цена"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  required
                />
              </div>
              <textarea
                placeholder="Описание"
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                rows={3}
              />

              <div className={styles.imageUpload}>
                <label htmlFor="imageInput">Изображение товара</label>
                <input
                  type="file"
                  id="imageInput"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
                {uploading && <span className={styles.uploading}>Загрузка...</span>}
                {productForm.image_url && (
                  <div className={styles.imagePreview}>
                    <img src={productForm.image_url} alt="Preview" />
                  </div>
                )}
              </div>

              <div className={styles.formRow}>
                <select
                  value={productForm.category_id}
                  onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                >
                  <option value="">Без категории</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Количество"
                  value={productForm.stock}
                  onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                />
              </div>

              <div className={styles.checkboxRow}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={productForm.is_active}
                    onChange={(e) => setProductForm({ ...productForm, is_active: e.target.checked })}
                  />
                  <span>Активен (отображается в каталоге)</span>
                </label>
              </div>

              <div className={styles.formActions}>
                <button type="submit" className={styles.submitProductBtn}>
                  {editingProduct ? 'Сохранить изменения' : 'Создать товар'}
                </button>
                {editingProduct && (
                  <button type="button" className={styles.cancelBtn} onClick={handleCancelEdit}>
                    Отмена
                  </button>
                )}
              </div>
            </form>
          )}

          <div className={`${styles.productsList} ${globalViewMode === 'grid' ? styles.productsGrid : ''}`}>
            {processedProducts.map(product => (
              <div key={product.id} className={styles.productCard}>
                <img
                  src={product.image_url || 'https://via.placeholder.com/100'}
                  alt={product.name}
                  className={styles.productThumb}
                />
                <div className={styles.productDetails}>
                  <h3>{product.name}</h3>
                  <p className={styles.truncatedText}>
                    {expandedDescriptions[`product_${product.id}`]
                      ? product.description
                      : (product.description && product.description.length > 100
                        ? product.description.substring(0, 100) + '...'
                        : product.description)}
                  </p>
                  {product.description && product.description.length > 100 && (
                    <button
                      className={styles.expandBtn}
                      onClick={() => setExpandedDescriptions(prev => ({
                        ...prev,
                        [`product_${product.id}`]: !prev[`product_${product.id}`]
                      }))}
                    >
                      {expandedDescriptions[`product_${product.id}`] ? 'Свернуть' : 'Читать далее...'}
                    </button>
                  )}
                  <div className={styles.productMeta}>
                    <span className={styles.productPrice}>{product.price} ₽</span>
                    <span className={styles.productStock}>Склад: {product.stock}</span>
                    <span className={product.is_active ? styles.statusActive : styles.statusInactive}>
                      {product.is_active ? 'Активен' : 'Неактивен'}
                    </span>
                  </div>
                </div>
                <div className={styles.productActions}>
                  <button
                    className={styles.editProductBtn}
                    onClick={() => handleEditProduct(product)}
                  >
                    Редактировать
                  </button>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => openConfirmModal('delete_product', product)}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'users' && userProfile?.role === 'admin' && (
        <div className={styles.usersSection}>
          <div className={styles.filtersBar}>
            <div className={styles.searchWrapper}>
              <img src="/images/ico/icoLupa.png" alt="Поиск" className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Поиск по имени и email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            <select
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">Все роли</option>
              <option value="user">Пользователи</option>
              <option value="manager">Менеджеры</option>
              <option value="admin">Администраторы</option>
            </select>

            <span className={styles.searchCount}>Всего: {processedUsers.length}</span>

            <button
              onClick={() => setGlobalViewMode(globalViewMode === 'list' ? 'grid' : 'list')}
              className={styles.viewToggleBtn}
            >
              <img src="/images/ico/icoMain.png" alt="Вид" className={styles.viewIcon} />
            </button>
          </div>
          <h2>Пользователи</h2>

          {processedUsers.length === 0 ? (
            <p className={styles.empty}>Пользователей пока нет</p>
          ) : (
            <div className={`${styles.usersList} ${globalViewMode === 'grid' ? styles.usersGrid : ''}`}>
              {processedUsers.map(user => (
                <div key={user.id} className={styles.userCard}>
                  <div className={styles.userInfo}>
                    <div className={styles.userMainInfo}>
                      <h3>{user.name}</h3>
                      <span className={styles.userEmail}>{user.email}</span>
                    </div>
                    <span className={`${styles.roleBadge} ${styles['role_' + user.role]}`}>
                      {user.role === 'admin' ? 'Админ' : user.role === 'manager' ? 'Менеджер' : 'Пользователь'}
                    </span>
                  </div>
                  <p className={styles.userDate}>
                    Регистрация: {new Date(user.created_at).toLocaleDateString('ru-RU')}
                  </p>

                  {editingUser === user.id ? (
                    <form className={styles.userEditForm} onSubmit={handleUpdateUser}>
                      <div className={styles.formRow}>
                        <div
                          className={userForm.name !== originalUser.name ? styles.inputModified : ''}
                          onClick={(e) => {
                            if (e.target.tagName === 'INPUT') return;
                            setUserForm({ ...userForm, name: originalUser.name });
                          }}
                        >
                          <input
                            type="text"
                            placeholder="Никнейм"
                            value={userForm.name}
                            onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                            required
                          />
                        </div>
                        <div
                          className={userForm.email !== originalUser.email ? styles.inputModified : ''}
                          onClick={(e) => {
                            if (e.target.tagName === 'INPUT') return;
                            setUserForm({ ...userForm, email: originalUser.email });
                          }}
                        >
                          <input
                            type="email"
                            placeholder="Email"
                            value={userForm.email}
                            onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                            required
                          />
                        </div>
                        <div
                          className={userForm.role !== originalUser.role ? styles.inputModified : ''}
                          onClick={(e) => {
                            if (e.target.tagName === 'SELECT') return;
                            setUserForm({ ...userForm, role: originalUser.role });
                          }}
                        >
                          <select
                            value={userForm.role}
                            onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                          >
                            <option value="user">Пользователь</option>
                            <option value="manager">Менеджер</option>
                            <option value="admin">Админ</option>
                          </select>
                        </div>
                      </div>
                      <div className={styles.userActions}>
                        <button type="submit" className={styles.saveUserBtn}>Сохранить</button>
                        <button type="button" className={styles.cancelBtn} onClick={handleCancelUserEdit}>Отмена</button>
                      </div>
                    </form>
                  ) : (
                    <div className={styles.userActions}>
                      <button
                        className={styles.editUserBtn}
                        onClick={() => handleEditUser(user)}
                      >
                        Редактировать
                      </button>
                      <button
                        className={styles.resetPasswordBtn}
                        onClick={() => openConfirmModal('reset_password', user)}
                      >
                        Сбросить пароль
                      </button>
                      <button
                        className={styles.deleteUserBtn}
                        onClick={() => openConfirmModal('delete_user', user)}
                      >
                        Удалить
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'questions' && (
        <div className={styles.questionsSection}>
          <div className={styles.filtersBar}>
            <div className={styles.searchWrapper}>
              <img src="/images/ico/icoLupa.png" alt="Поиск" className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Поиск по вопросам..."
                value={questionSearch}
                onChange={(e) => setQuestionSearch(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            <select
              value={questionStatusFilter}
              onChange={(e) => setQuestionStatusFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">Все вопросы</option>
              <option value="new">Новые / На модерации</option>
              <option value="published">Опубликованные</option>
              <option value="answered">С ответом</option>
            </select>

            <span className={styles.searchCount}>Всего: {
              questions.filter(q => {
                if (!questionSearch.trim()) return true;
                const query = questionSearch.toLowerCase();
                return (
                  q.user_name?.toLowerCase().includes(query) ||
                  q.question?.toLowerCase().includes(query) ||
                  q.products?.name?.toLowerCase().includes(query)
                );
              }).filter(q => {
                if (!questionStatusFilter) return true;
                if (questionStatusFilter === 'new') return !q.is_published;
                if (questionStatusFilter === 'published') return q.is_published;
                if (questionStatusFilter === 'answered') return q.is_answered;
                return true;
              }).length
            }</span>

            <button
              onClick={() => setGlobalViewMode(globalViewMode === 'list' ? 'grid' : 'list')}
              className={styles.viewToggleBtn}
            >
              <img src="/images/ico/icoMain.png" alt="Вид" className={styles.viewIcon} />
            </button>
          </div>

          {
            questions.filter(q => {
              if (!questionSearch.trim()) return true;
              const query = questionSearch.toLowerCase();
              return (
                q.user_name?.toLowerCase().includes(query) ||
                q.question?.toLowerCase().includes(query) ||
                q.products?.name?.toLowerCase().includes(query)
              );
            }).filter(q => {
              if (!questionStatusFilter) return true;
              if (questionStatusFilter === 'new') return !q.is_published;
              if (questionStatusFilter === 'published') return q.is_published;
              if (questionStatusFilter === 'answered') return q.is_answered;
              return true;
            }).length === 0 ? (
              <p className={styles.empty}>Вопросов пока нет</p>
            ) : (
              <div className={`${styles.requestsList} ${globalViewMode === 'grid' ? styles.requestsGrid : ''}`}>
                {questions.filter(q => {
                  if (!questionSearch.trim()) return true;
                  const query = questionSearch.toLowerCase();
                  return (
                    q.user_name?.toLowerCase().includes(query) ||
                    q.question?.toLowerCase().includes(query) ||
                    q.products?.name?.toLowerCase().includes(query)
                  );
                }).filter(q => {
                  if (!questionStatusFilter) return true;
                  if (questionStatusFilter === 'new') return !q.is_published;
                  if (questionStatusFilter === 'published') return q.is_published;
                  if (questionStatusFilter === 'answered') return q.is_answered;
                  return true;
                }).map(q => (
                  <div key={q.id} className={styles.requestCard}>
                    <div className={styles.requestLeft}>
                      <div className={styles.requestHeader}>
                        <div>
                          Пользователь: <strong> {q.user_name}</strong>
                          <div
                            style={{
                              fontSize: '13px',
                              color: '#0d9488',
                              marginTop: '4px',
                              cursor: 'pointer',
                              position: 'relative'
                            }}
                            onClick={() => window.open(`/product/${q.products.id}`, '_blank')}
                            onMouseEnter={(e) => {
                              setHoveredProduct(q.products.id);
                              window.lastMouseX = e.clientX;
                              window.lastMouseY = e.clientY;
                            }}
                            onMouseLeave={() => setHoveredProduct(null)}
                          >
                            📦 О товаре: <strong>{q.products?.name}</strong>

                            {/* Всплывающая карточка товара при наведении */}
                            {hoveredProduct === q.products.id && (
                              <div style={{
                                position: 'fixed',
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                padding: '12px',
                                width: '220px',
                                zIndex: 999,
                                boxShadow: '0 8px 24px var(--shadow-color)',
                                left: `${document.body.scrollLeft + window.lastMouseX - 110}px`,
                                top: `${document.body.scrollTop + window.lastMouseY + 10}px`,
                                animation: 'fadeIn 0.15s ease'
                              }}>
                                <img
                                  src={products.find(p => p.id === q.products.id)?.image_url || 'https://via.placeholder.com/200'}
                                  alt={q.products.name}
                                  style={{
                                    width: '100%',
                                    height: '100px',
                                    objectFit: 'contain',
                                    borderRadius: '4px',
                                    marginBottom: '8px',
                                    background: 'var(--bg-tertiary)'
                                  }}
                                />
                                <p style={{ margin: '0 0 4px 0', fontWeight: 600, fontSize: '13px' }}>{q.products.name}</p>
                                <p style={{ margin: '0', fontSize: '12px', color: '#0d9488' }}>
                                  💰 {products.find(p => p.id === q.products.id)?.price || 0} ₽
                                </p>
                                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                  На складе: {products.find(p => p.id === q.products.id)?.stock || 0} шт.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        <span className={styles.requestDate}>
                          {new Date(q.created_at).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                      <p className={styles.requestMessage}>Спрашивает: {q.question}</p>
                    </div>

                    <div className={styles.requestRight}>
                      <div className={styles.requestStatus}>
                        {!q.is_published && <span className={`${styles.status} ${styles.statusPending}`}>На модерации</span>}
                        {q.is_published && !q.is_answered && <span className={`${styles.status} ${styles.statusInProgress}`}>Опубликован</span>}
                        {q.is_answered && <span className={`${styles.status} ${styles.statusCompleted}`}>Отвечен</span>}
                      </div>
                      <div className={styles.requestActions}>
                        {editingQuestion !== q.id ? (
                          <>
                            {/* Отображаем ответ если он существует */}
                            {q.product_answers && q.product_answers.length > 0 && (
                              <div style={{
                                width: '100%',
                                marginTop: '12px',
                                padding: '12px',
                                background: 'rgba(13, 148, 136, 0.08)',
                                borderLeft: '3px solid #0d9488',
                                borderRadius: '0 8px 8px 0'
                              }}>
                                <div style={{
                                  fontWeight: 600,
                                  color: '#0d9488',
                                  fontSize: '13px',
                                  marginBottom: '6px'
                                }}>
                                  Ответ от {q.product_answers[0].responder_name}:
                                </div>
                                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>
                                  {q.product_answers[0].answer_text}
                                </p>
                              </div>
                            )}

                            <button
                              className={styles.editBtn}
                              onClick={() => {
                                setEditingQuestion(q.id);
                                // Если есть уже ответ - подставляем его в поле ввода
                                if (q.product_answers && q.product_answers.length > 0) {
                                  setAnswerText(q.product_answers[0].answer_text);
                                } else {
                                  setAnswerText('');
                                }
                              }}
                            >
                              {q.product_answers && q.product_answers.length > 0 ? 'Изменить ответ' : 'Ответить'}
                            </button>
                            {!q.is_published && (
                              <button
                                className={styles.editBtn}
                                onClick={async () => {
                                  await supabase
                                    .from('product_questions')
                                    .update({ is_published: true })
                                    .eq('id', q.id);
                                  fetchData();
                                  showSuccess('Вопрос опубликован!');
                                }}
                              >
                                Опубликовать
                              </button>
                            )}
                            <button
                              className={styles.deleteBtn}
                              onClick={() => openConfirmModal('delete_question', q)}
                            >
                              Удалить
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>

                    {editingQuestion === q.id && (
                      <div className={styles.editForm}>
                        <textarea
                          value={answerText}
                          onChange={(e) => setAnswerText(e.target.value.slice(0, 500))}
                          placeholder="Ответ на вопрос..."
                          rows={3}
                          maxLength={500}
                        />
                        <div className={styles.editActions}>
                          <button onClick={async () => {
                            try {
                              const { data: { session } } = await supabase.auth.getSession();

                              const response = await fetch('https://mutebkvjowivxupnexzp.supabase.co/functions/v1/submit-answer', {
                                method: 'POST',
                                headers: {
                                  'Authorization': `Bearer ${session.access_token}`,
                                  'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                  questionId: q.id,
                                  answerText: answerText,
                                  responderId: user.id,
                                  responderName: userProfile.name
                                })
                              });

                              if (!response.ok) {
                                const error = await response.json();
                                throw new Error(error.error || 'Ошибка сервера');
                              }

                              setEditingQuestion(null);
                              setAnswerText('');
                              fetchData();
                              showSuccess('✅ Ответ сохранен и опубликован!');
                            } catch (error) {
                              console.error('Ошибка отправки ответа:', error);
                              alert(`Ошибка: ${error.message}`);
                            }
                          }}>Отправить ответ</button>
                          <button onClick={() => setEditingQuestion(null)}>Отмена</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
        </div>

      )}

      {activeTab === 'categories' && (
        <div className={styles.categoriesSection}>
          <div className={styles.filtersBar}>
            <div className={styles.searchWrapper}>
              <img src="/images/ico/icoLupa.png" alt="Поиск" className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Поиск категорий..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            <span className={styles.searchCount}>Всего: {processedCategories.length}</span>
            <button
              className={styles.addBtn}
              onClick={() => {
                setEditingCategory(null);
                setCategoryForm({ name: '', description: '' });
                setShowCategoryForm(true);
              }}
            >
              + Добавить категорию
            </button>
          </div>

          {showCategoryForm && (
            <form className={styles.categoryForm} onSubmit={editingCategory ? handleUpdateCategory : handleCreateCategory}>
              <h3>{editingCategory ? 'Редактирование категории' : 'Новая категория'}</h3>
              <input
                type="text"
                placeholder="Название категории"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                required
              />
              <textarea
                placeholder="Описание (необязательно)"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                rows={2}
              />
              <div className={styles.formActions}>
                <button type="submit" className={styles.submitProductBtn}>
                  {editingCategory ? 'Сохранить' : 'Создать'}
                </button>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowCategoryForm(false)}>
                  Отмена
                </button>
              </div>
            </form>
          )}

          <div className={styles.categoriesList}>
            {processedCategories.map(cat => (
              <div key={cat.id} className={styles.categoryCard}>
                <div className={styles.categoryInfo}>
                  <h3>{cat.name}</h3>
                  {cat.description && (
                    <>
                      <p className={styles.truncatedText}>
                        {expandedDescriptions[`category_${cat.id}`]
                          ? cat.description
                          : (cat.description.length > 100
                            ? cat.description.substring(0, 100) + '...'
                            : cat.description)}
                      </p>
                      {cat.description.length > 100 && (
                        <button
                          className={styles.expandBtn}
                          onClick={() => setExpandedDescriptions(prev => ({
                            ...prev,
                            [`category_${cat.id}`]: !prev[`category_${cat.id}`]
                          }))}
                        >
                          {expandedDescriptions[`category_${cat.id}`] ? 'Свернуть' : 'Читать далее...'}
                        </button>
                      )}
                    </>
                  )}
                  <span className={styles.categoryProductsCount}>
                    Товаров: {products.filter(p => p.category_id === cat.id).length}
                  </span>
                </div>
                <div className={styles.categoryActions}>
                  <button
                    className={styles.editProductBtn}
                    onClick={() => {
                      setEditingCategory(cat.id);
                      setCategoryForm({ name: cat.name, description: cat.description || '' });
                      setShowCategoryForm(true);
                    }}
                  >
                    Редактировать
                  </button>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => openConfirmModal('delete_category', cat)}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Уведомление об успехе */}
      {successMessage && (
        <div className={styles.successNotification}>
          {successMessage}
        </div>
      )}

      {/* Модальное окно подтверждения действий */}
      {confirmModal && (
        <ConfirmModal
          isOpen={!!confirmModal}
          onClose={() => setConfirmModal(null)}
          onConfirm={handleConfirmAction}
          title="Подтверждение действия"
          message={
            confirmModal.action === 'delete_product' ? `Вы действительно хотите удалить товар "${confirmModal.item.name}"? Это действие нельзя отменить.` :
            confirmModal.action === 'delete_request' ? `Вы действительно хотите удалить заявку от ${confirmModal.item.profiles?.name}?` :
            confirmModal.action === 'delete_user' ? `Вы действительно хотите удалить пользователя "${confirmModal.item.name}"?` :
            confirmModal.action === 'reset_password' ? `Отправить ссылку для сброса пароля на email ${confirmModal.item.email}?` :
            confirmModal.action === 'cancel_edit_product' ? 'Отменить редактирование товара? Все несохраненные изменения будут потеряны.' :
            confirmModal.action === 'cancel_edit_user' ? 'Отменить редактирование пользователя? Все несохраненные изменения будут потеряны.' :
            confirmModal.action === 'delete_category' ? `Вы действительно хотите удалить категорию "${confirmModal.item.name}"? Товары в этой категории останутся без категории.` :
            ''
          }
          confirmText="Подтвердить"
        />
      )}

      {/* Модальное окно для обрезки изображения */}
      {showCropper && (
        <div className={styles.cropperOverlay} onMouseMove={handleCropMouseMove} onMouseUp={handleCropMouseUp} onMouseLeave={handleCropMouseUp}>
          <div className={styles.cropperContainer}>
            <h3 className={styles.cropperTitle}>Выберите область для фотографии</h3>
            <p className={styles.cropperHint}>Фотографии всех товаров будут одинакового размера 600×800 px</p>

            <div className={styles.cropperImageWrapper}>
              <img
                src={originalImage}
                alt="Original"
                className={styles.cropperImage}
                onLoad={handleCropperImageLoad}
                draggable={false}
              />

              {/* Рамка выбора области */}
              <div
                className={styles.cropSelection}
                style={{
                  left: cropSelection.x,
                  top: cropSelection.y,
                  width: cropSelection.width,
                  height: cropSelection.height
                }}
                onMouseDown={handleCropMouseDown}
              >
                <div className={`${styles.cropResizeHandle} ${styles.cropHandleTL}`} data-corner="tl" onMouseDown={handleCropMouseDown}></div>
                <div className={`${styles.cropResizeHandle} ${styles.cropHandleTR}`} data-corner="tr" onMouseDown={handleCropMouseDown}></div>
                <div className={`${styles.cropResizeHandle} ${styles.cropHandleBL}`} data-corner="bl" onMouseDown={handleCropMouseDown}></div>
                <div className={`${styles.cropResizeHandle} ${styles.cropHandleBR}`} data-corner="br" onMouseDown={handleCropMouseDown}></div>
              </div>

              {/* Затемнение вокруг выбранной области */}
              <div className={styles.cropOverlay} style={{
                clipPath: `polygon(
                  0% 0%, 0% 100%, 
                  ${cropSelection.x}px 100%, ${cropSelection.x}px ${cropSelection.y}px, 
                  ${cropSelection.x + cropSelection.width}px ${cropSelection.y}px, ${cropSelection.x + cropSelection.width}px ${cropSelection.y + cropSelection.height}px, 
                  ${cropSelection.x}px ${cropSelection.y + cropSelection.height}px, ${cropSelection.x}px 100%, 
                  100% 100%, 100% 0%
                )`
              }}></div>
            </div>

            <div className={styles.cropperActions}>
              <button className={styles.cropperCancelBtn} onClick={handleCropCancel}>Отмена</button>
              <button className={styles.cropperConfirmBtn} onClick={handleCropConfirm} disabled={uploading}>
                {uploading ? 'Обработка...' : 'Использовать эту область'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Admin;