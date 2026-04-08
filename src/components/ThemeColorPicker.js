import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './ThemeColorPicker.module.css';

const ThemeColorPicker = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [baseColor, setBaseColor] = useState('#0f172a');
  const pickerRef = useRef(null);

  const adjustColor = (color, amount) => {
    const clamp = (num) => Math.min(255, Math.max(0, num));

    let hex = color.replace('#', '');
    let r = parseInt(hex.substr(0, 2), 16);
    let g = parseInt(hex.substr(2, 2), 16);
    let b = parseInt(hex.substr(4, 2), 16);

    r = clamp(r + amount);
    g = clamp(g + amount);
    b = clamp(b + amount);

    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };

  // Расчет яркости по стандарту sRGB (от 0 до 255)
  const getLuminance = (color) => {
    let hex = color.replace('#', '');
    let r = parseInt(hex.substr(0, 2), 16);
    let g = parseInt(hex.substr(2, 2), 16);
    let b = parseInt(hex.substr(4, 2), 16);
    
    // Стандартная формула воспринимаемой яркости
    return 0.299 * r + 0.587 * g + 0.114 * b;
  };

  // Ограничение максимальной яркости цвета
  const limitBrightness = (color, maxLuminance = 80) => {
    let luminance = getLuminance(color);
    
    // Если яркость в норме - возвращаем как есть
    if (luminance <= maxLuminance) {
      return color;
    }

    // Постепенно затемняем цвет пока не достигнем нужной яркости
    let currentColor = color;
    while (getLuminance(currentColor) > maxLuminance) {
      currentColor = adjustColor(currentColor, -5);
    }
    
    return currentColor;
  };

  const applyThemeColors = useCallback((color) => {
    const secondary = adjustColor(color, 15);
    const tertiary = adjustColor(color, 30);
    
    document.documentElement.style.setProperty('--dark-primary', color);
    document.documentElement.style.setProperty('--dark-secondary', secondary);
    document.documentElement.style.setProperty('--dark-tertiary', tertiary);
  }, []);

  useEffect(() => {
    const savedColor = localStorage.getItem('theme-dark-color');
    if (savedColor) {
      setBaseColor(savedColor);
      applyThemeColors(savedColor);
    }

    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      setIsDarkTheme(isDark);
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    setIsDarkTheme(document.documentElement.getAttribute('data-theme') === 'dark');

    return () => observer.disconnect();
  }, [applyThemeColors]);

  // Закрытие панели при клике вне её области
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleColorChange = (e) => {
    let color = e.target.value;
    
    // Автоматически ограничиваем яркость для темной темы
    color = limitBrightness(color, 80);
    
    setBaseColor(color);
    applyThemeColors(color);
    localStorage.setItem('theme-dark-color', color);
  };

  const resetToDefault = () => {
    setBaseColor('#0f172a');
    applyThemeColors('#0f172a');
    localStorage.removeItem('theme-dark-color');
  };

  return (
    <div ref={pickerRef} className={`${styles.pickerContainer} ${isOpen ? styles.open : ''} ${isDarkTheme ? styles.visible : ''}`}>
      <button
        className={styles.toggleBtn}
        onClick={() => setIsOpen(!isOpen)}
        title="Настроить цвет темы"
      >
        🎨
      </button>

      <div className={styles.pickerPanel}>
        <h3 className={styles.title}>Цвет темной темы</h3>

        <div className={styles.colorRow}>
          <input
            type="color"
            value={baseColor}
            onChange={handleColorChange}
            className={styles.colorInput}
          />
          <span className={styles.colorCode}>{baseColor}</span>
        </div>

        <div className={styles.previewRow}>
          <div className={styles.previewItem} style={{ background: baseColor }}>Основной</div>
          <div className={styles.previewItem} style={{ background: adjustColor(baseColor, 15) }}>Вторичный</div>
          <div className={styles.previewItem} style={{ background: adjustColor(baseColor, 30) }}>Третичный</div>
        </div>

        <button className={styles.resetBtn} onClick={resetToDefault}>
          Сбросить на стандарт
        </button>
      </div>
    </div>
  );
};

export default ThemeColorPicker;