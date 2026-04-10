import React, { useState, useRef, useEffect, useCallback } from 'react';
import styles from './LightingCalculator.module.css';
import ConfirmModal from '../components/ConfirmModal';

const TOOLS = {
  CURSOR: 'cursor',
  WIRE: 'wire',
  LAMP: 'lamp',
  ROOM: 'room'
};

const LAMP_TYPES = [
  { id: 'led', name: 'LED', lmPerWatt: 90 },
  { id: 'halogen', name: 'Галоген', lmPerWatt: 15 },
  { id: 'fluorescent', name: 'Люминесцентная', lmPerWatt: 60 },
  { id: 'incandescent', name: 'Накаливания', lmPerWatt: 10 }
];

const LightingCalculator = () => {
  const canvasRef = useRef(null);
  const [rooms, setRooms] = useState([
    { id: 1, x: 100, y: 100, width: 5, height: 4, ceilingHeight: 2.5, name: 'Гостиная' }
  ])
  const [selectedRoomId, setSelectedRoomId] = useState(1);
  const [wires, setWires] = useState([]);
  const [lamps, setLamps] = useState([]);
  const [selectedLampId, setSelectedLampId] = useState(null);
  const [activeTool, setActiveTool] = useState(TOOLS.CURSOR);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentWire, setCurrentWire] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [scale] = useState(31); // 1 метр = 45 пикселей
  const [history, setHistory] = useState([]);
  const [showClearWiresModal, setShowClearWiresModal] = useState(false);
  const [showClearLampsModal, setShowClearLampsModal] = useState(false);

  const [isLoaded, setIsLoaded] = useState(false);
  const [tempDragObject, setTempDragObject] = useState(null);

  // Загрузка данных из localStorage при инициализации
  useEffect(() => {
    const savedData = localStorage.getItem('lightingCalculatorState');
    if (savedData) {
      try {
        const { timestamp, rooms, wires, lamps, history: savedHistory } = JSON.parse(savedData);
        const ONE_HOUR = 60 * 60 * 1000;

        // Если данные не старше 1 часа - восстанавливаем
        if (Date.now() - timestamp < ONE_HOUR) {
          setRooms(rooms);
          setWires(wires);
          setLamps(lamps);
          setHistory(savedHistory);
        }
      } catch (e) {
        console.error('Ошибка восстановления данных калькулятора:', e);
        // Если данные битые - удаляем
        localStorage.removeItem('lightingCalculatorState');
      }
    }
    setIsLoaded(true);
  }, []);

  // Сохранение данных в localStorage при любом изменении ТОЛЬКО после загрузки
  useEffect(() => {
    if (!isLoaded) return; // Предотвращаем перезапись данных до завершения загрузки

    const saveData = {
      timestamp: Date.now(),
      rooms,
      wires,
      lamps,
      history
    };
    localStorage.setItem('lightingCalculatorState', JSON.stringify(saveData));
  }, [rooms, wires, lamps, history, isLoaded]);

  const selectedRoom = rooms.find(r => r.id === selectedRoomId) || rooms[0];
  const selectedLamp = lamps.find(l => l.id === selectedLampId);

  const checkCollision = (newRoom, excludeId = null) => {
    for (const room of rooms) {
      if (room.id === excludeId) continue;

      const r1 = {
        left: newRoom.x,
        right: newRoom.x + newRoom.width * scale,
        top: newRoom.y,
        bottom: newRoom.y + newRoom.height * scale
      };

      const r2 = {
        left: room.x,
        right: room.x + room.width * scale,
        top: room.y,
        bottom: room.y + room.height * scale
      };

      // Разрешаем прилегание (равенство координат)
      if (!(r1.right <= r2.left || r1.left >= r2.right || r1.bottom <= r2.top || r1.top >= r2.bottom)) {
        return true;
      }
    }
    return false;
  };

  const calculateLampRadius = (lamp) => {
    const angleRad = (lamp.angle / 2) * Math.PI / 180;
    return lamp.height * Math.tan(angleRad);
  };

  const calculateTotalLighting = useCallback(() => {
    let totalArea = 0;
    let totalVolume = 0;
    let totalLumens = 0;
    let totalWattage = 0;

    rooms.forEach(room => {
      totalArea += room.width * room.height;
      totalVolume += room.width * room.height * room.ceilingHeight;
    });

    lamps.forEach(lamp => {
      totalLumens += lamp.lumens;
      totalWattage += lamp.power;
    });

    return {
      totalArea: totalArea.toFixed(2),
      totalVolume: totalVolume.toFixed(2),
      totalLumens,
      totalWattage,
      averageLux: totalArea > 0 ? Math.round(totalLumens / totalArea) : 0,
      lampsCount: lamps.length
    };
  }, [rooms, lamps]);

  const calculateWireLength = useCallback(() => {
    let totalLength = 0;
    wires.forEach(wire => {
      for (let i = 1; i < wire.points.length; i++) {
        const dx = (wire.points[i].x - wire.points[i - 1].x) / scale;
        const dy = (wire.points[i].y - wire.points[i - 1].y) / scale;
        totalLength += Math.sqrt(dx * dx + dy * dy);
      }
    });
    return totalLength.toFixed(2);
  }, [wires, scale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';

    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Отрисовка сетки
    ctx.strokeStyle = isDarkTheme ? '#2d3748' : '#e0e0e0';
    ctx.lineWidth = 1;

    for (let x = 0; x <= canvas.width; x += scale) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    for (let y = 0; y <= canvas.height; y += scale) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Отрисовка зон освещения лампочек
    lamps.forEach(lamp => {
      const radius = calculateLampRadius(lamp) * scale;

      // Зона отлично освещена (>300 Люкс)
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, radius * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(76, 175, 80, 0.35)';
      ctx.fill();

      // Зона нормально освещена (150-300 Люкс)
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, radius * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 235, 59, 0.25)';
      ctx.fill();

      // Зона слабое освещение (<150 Люкс)
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(244, 67, 54, 0.15)';
      ctx.fill();

      // Контуры зон
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, radius * 0.4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(76, 175, 80, 0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, radius * 0.7, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 235, 59, 0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(244, 67, 54, 0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Отрисовка комнат
    rooms.forEach(room => {
      const w = room.width * scale;
      const h = room.height * scale;

      if (isDarkTheme) {
        // Темная тема: инвертируем, делаем темный фон и светлые бордеры
        ctx.fillStyle = room.id === selectedRoomId ? 'rgba(52, 152, 219, 0.15)' : 'rgba(0,0,0,0.25)';
        ctx.strokeStyle = room.id === selectedRoomId ? '#3498db' : '#94a3b8';
      } else {
        // Светлая тема: прозрачный фон и темные бордеры как было
        ctx.fillStyle = room.id === selectedRoomId ? 'rgba(52, 152, 219, 0.1)' : 'rgba(0,0,0,0.02)';
        ctx.strokeStyle = room.id === selectedRoomId ? '#3498db' : '#2c3e50';
      }

      ctx.fillRect(room.x, room.y, w, h);
      ctx.lineWidth = room.id === selectedRoomId ? 3 : 2;
      ctx.strokeRect(room.x, room.y, w, h);

      ctx.fillStyle = isDarkTheme ? '#cbd5e1' : '#2c3e50';
      ctx.font = '12px sans-serif';
      ctx.fillText(room.name, room.x + 8, room.y + 20);
    });

    // Отрисовка проводов
    wires.forEach(wire => {
      if (wire.points.length < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = '#e74c3c';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.moveTo(wire.points[0].x, wire.points[0].y);
      for (let i = 1; i < wire.points.length; i++) {
        ctx.lineTo(wire.points[i].x, wire.points[i].y);
      }
      ctx.stroke();
    });

    // Отрисовка лампочек
    lamps.forEach(lamp => {
      const isSelected = lamp.id === selectedLampId;

      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, isSelected ? 12 : 8, 0, Math.PI * 2);
      ctx.fillStyle = '#f1c40f';
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#3498db' : '#f39c12';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();
    });

    // Отрисовка текущего провода который рисуем
    if (currentWire.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = '#3498db';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';

      ctx.moveTo(currentWire[0].x, currentWire[0].y);
      for (let i = 1; i < currentWire.length; i++) {
        ctx.lineTo(currentWire[i].x, currentWire[i].y);
      }
      ctx.stroke();
    }

  }, [rooms, wires, lamps, currentWire, selectedRoomId, selectedLampId, scale]);

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const findRoomAtPosition = (x, y) => {
    for (let i = rooms.length - 1; i >= 0; i--) {
      const room = rooms[i];
      if (x >= room.x && x <= room.x + room.width * scale &&
        y >= room.y && y <= room.y + room.height * scale) {
        return room;
      }
    }
    return null;
  };

  const findLampAtPosition = (x, y) => {
    for (let i = lamps.length - 1; i >= 0; i--) {
      const lamp = lamps[i];
      const distance = Math.sqrt(Math.pow(x - lamp.x, 2) + Math.pow(y - lamp.y, 2));
      if (distance < 15) return lamp;
    }
    return null;
  };

  const handleMouseDown = (e) => {
    const coords = getCanvasCoords(e);

    if (activeTool === TOOLS.CURSOR) {
      const lamp = findLampAtPosition(coords.x, coords.y);
      if (lamp) {
        setSelectedLampId(lamp.id);
        setSelectedRoomId(null);
        setIsDragging(true);
        setDragOffset({
          x: coords.x - lamp.x,
          y: coords.y - lamp.y
        });
        // Сохраняем состояние лампы перед перетаскиванием
        setTempDragObject({ type: 'lampMove', id: lamp.id, before: {...lamp} });
        return;
      }

      const room = findRoomAtPosition(coords.x, coords.y);
      if (room) {
        setSelectedRoomId(room.id);
        setSelectedLampId(null);
        setIsDragging(true);
        setDragOffset({
          x: coords.x - room.x,
          y: coords.y - room.y
        });
        // Сохраняем состояние комнаты перед перетаскиванием
        setTempDragObject({ type: 'roomMove', id: room.id, before: {...room} });
      } else {
        setSelectedRoomId(null);
        setSelectedLampId(null);
      }
    } else if (activeTool === TOOLS.WIRE) {
      setIsDrawing(true);
      setCurrentWire([coords]);
    } else if (activeTool === TOOLS.LAMP) {
      const newLamp = {
        id: Date.now(),
        x: coords.x,
        y: coords.y,
        power: 10,
        type: 'led',
        angle: 120,
        height: 2.5,
        lumens: 900
      };
      setLamps(prev => [...prev, newLamp]);
      setHistory(prev => [...prev, { type: 'lamp', data: newLamp }]);
    } else if (activeTool === TOOLS.ROOM) {
      const newRoom = {
        id: Date.now(),
        x: Math.round(coords.x / scale) * scale,
        y: Math.round(coords.y / scale) * scale,
        width: 4,
        height: 3,
        ceilingHeight: 2.7,
        name: `Комната ${rooms.length + 1}`
      };

      if (!checkCollision(newRoom)) {
        setRooms(prev => [...prev, newRoom]);
        setSelectedRoomId(newRoom.id);
        setSelectedLampId(null);
        setHistory(prev => [...prev, { type: 'room', data: newRoom }]);
      }
    }
  };

  const handleMouseMove = (e) => {
    const coords = getCanvasCoords(e);

    if (isDragging) {
      if (selectedRoomId) {
        const canvas = canvasRef.current;
        const maxX = canvas.width - selectedRoom.width * scale;
        const maxY = canvas.height - selectedRoom.height * scale;

        setRooms(prev => prev.map(room => {
          if (room.id !== selectedRoomId) return room;

          let newX = Math.round((coords.x - dragOffset.x) / (scale / 2)) * (scale / 2);
          let newY = Math.round((coords.y - dragOffset.y) / (scale / 2)) * (scale / 2);

          newX = Math.max(0, Math.min(newX, maxX));
          newY = Math.max(0, Math.min(newY, maxY));

          const updatedRoom = { ...room, x: newX, y: newY };

          if (!checkCollision(updatedRoom, selectedRoomId)) {
            return updatedRoom;
          }
          return room;
        }));
      } else if (selectedLampId) {
        setLamps(prev => prev.map(lamp =>
          lamp.id === selectedLampId
            ? { ...lamp, x: coords.x - dragOffset.x, y: coords.y - dragOffset.y }
            : lamp
        ));
      }
    }

    if (isDrawing) {
      setCurrentWire(prev => [...prev, coords]);
    }
  };

  const handleMouseUp = () => {
    if (currentWire.length > 1) {
      const newWire = {
        points: currentWire,
        color: '#e74c3c'
      };
      setWires(prev => [...prev, newWire]);
      setHistory(prev => [...prev, { type: 'wire', data: newWire }]);
    }
    
    // Очищаем временное состояние перетаскивания
    if (tempDragObject) {
      setHistory(prev => [...prev, tempDragObject]);
      setTempDragObject(null);
    }
    
    setIsDrawing(false);
    setIsDragging(false);
    setCurrentWire([]);
  };

  const clearWires = () => {
    setWires([]);
    setHistory(prev => prev.filter(h => h.type !== 'wire'));
    setShowClearWiresModal(false);
  };

  const clearLamps = () => {
    setLamps([]);
    setSelectedLampId(null);
    setHistory(prev => prev.filter(h => h.type !== 'lamp'));
    setShowClearLampsModal(false);
  };

  const undoLastAction = () => {
    if (history.length === 0) return;

    const lastAction = history[history.length - 1];

    if (lastAction.type === 'wire') {
      setWires(prev => prev.slice(0, -1));
    } else if (lastAction.type === 'lamp') {
      setLamps(prev => prev.slice(0, -1));
    } else if (lastAction.type === 'room') {
      setRooms(prev => prev.slice(0, -1));
    } else if (lastAction.type === 'lampDelete') {
      // Восстанавливаем удаленную лампу
      setLamps(prev => [...prev, lastAction.data]);
    } else if (lastAction.type === 'roomDelete') {
      // Восстанавливаем удаленную комнату
      setRooms(prev => [...prev, lastAction.data]);
    } else if (lastAction.type === 'lampMove') {
      // Отменяем перемещение лампы
      setLamps(prev => prev.map(l => l.id === lastAction.id ? lastAction.before : l));
    } else if (lastAction.type === 'roomMove') {
      // Отменяем перемещение комнаты
      setRooms(prev => prev.map(r => r.id === lastAction.id ? lastAction.before : r));
    } else if (lastAction.type === 'roomUpdate') {
      // Отменяем изменение параметров комнаты
      setRooms(prev => prev.map(r => r.id === lastAction.id ? lastAction.before : r));
    } else if (lastAction.type === 'lampUpdate') {
      // Отменяем изменение параметров лампы
      setLamps(prev => prev.map(l => l.id === lastAction.id ? lastAction.before : l));
    }

    // Ограничиваем историю последними 5 действиями
    setHistory(prev => prev.slice(0, -1).slice(-5));
  };

  const deleteSelectedRoom = () => {
    if (rooms.length <= 1) return;
    const deletedRoom = rooms.find(r => r.id === selectedRoomId);
    setRooms(prev => prev.filter(r => r.id !== selectedRoomId));
    setSelectedRoomId(rooms[0].id !== selectedRoomId ? rooms[0].id : rooms[1].id);
    setHistory(prev => [...prev, { type: 'roomDelete', data: deletedRoom }]);
  };

  const deleteSelectedLamp = () => {
    if (!selectedLampId) return;
    const deletedLamp = lamps.find(l => l.id === selectedLampId);
    setLamps(prev => prev.filter(l => l.id !== selectedLampId));
    setSelectedLampId(null);
    setHistory(prev => [...prev, { type: 'lampDelete', data: deletedLamp }]);
  };

  const updateSelectedRoom = (field, value) => {
    let val = parseFloat(value);
    if (!isNaN(val)) {
      val = Math.round(val * 2) / 2; // Округление до 0.5
    }
    setRooms(prev => prev.map(room =>
      room.id === selectedRoomId
        ? { ...room, [field]: val || room[field] }
        : room
    ));
    // Принудительно триггерим сохранение
    setHistory(h => [...h, { type: 'roomUpdate' }]);
  };

  const updateSelectedLamp = (field, value) => {
    const oldLamp = lamps.find(l => l.id === selectedLampId);
    
    setLamps(prev => prev.map(lamp => {
      if (lamp.id !== selectedLampId) return lamp;
      const updated = { ...lamp, [field]: parseFloat(value) || value };

      if (field === 'power' || field === 'type') {
        const lampType = LAMP_TYPES.find(t => t.id === updated.type);
        updated.lumens = Math.round(updated.power * (lampType?.lmPerWatt || 90));
      }

      return updated;
    }));
    
    if (oldLamp) {
      setHistory(prev => [...prev, { 
        type: 'lampUpdate', 
        id: selectedLampId, 
        before: oldLamp 
      }].slice(-5));
    }
  };

  const lighting = calculateTotalLighting();
  const wireLength = calculateWireLength();

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Калькулятор освещения и проводки</h1>

      <div className={styles.toolbar}>
        {Object.entries({
          [TOOLS.CURSOR]: 'cursorIcoRedact',
          [TOOLS.WIRE]: 'cableIcoRedact',
          [TOOLS.LAMP]: 'lampIcoRedact',
          [TOOLS.ROOM]: 'roomIcoRedact'
        }).map(([tool, iconName]) => (
          <button
            key={tool}
            className={`${styles.toolBtn} ${activeTool === tool ? styles.activeTool : ''}`}
            onClick={() => setActiveTool(tool)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <img
              src={`/images/ico/${iconName}.png`}
              alt={tool}
              style={{ width: '18px', height: '18px' }}
            />
            {{
              'cursorIcoRedact': 'Курсор',
              'cableIcoRedact': 'Провод',
              'lampIcoRedact': 'Лампа',
              'roomIcoRedact': 'Комната'
            }[iconName]}
          </button>
        ))}

        <div className={styles.legendRow}>
          <div className={styles.legendItemSmall} style={{ background: 'rgba(76, 175, 80, 0.35)' }}>🟢 Хорошо {'>'}300 Люкс</div>
          <div className={styles.legendItemSmall} style={{ background: 'rgba(255, 235, 59, 0.25)' }}>🟡 Нормально 150-300 Люкс</div>
          <div className={styles.legendItemSmall} style={{ background: 'rgba(244, 67, 54, 0.15)' }}>🔴 Слабо {'<'}150 Люкс</div>
        </div>

      </div>

      <div className={styles.grid}>
        <div className={styles.controls}>
          {selectedLamp ? (
            <div className={styles.card}>
              <h3>Параметры лампы</h3>

              <div className={styles.inputGroup}>
                <label>Тип лампы</label>
                <select
                  value={selectedLamp.type}
                  onChange={(e) => updateSelectedLamp('type', e.target.value)}
                  className={styles.select}
                >
                  {LAMP_TYPES.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label>Мощность (Вт)</label>
                <input
                  type="number"
                  value={selectedLamp.power}
                  onChange={(e) => updateSelectedLamp('power', e.target.value)}
                  step="0,5"
                  min="1"
                  max="200"
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Световой поток (Лм)</label>
                <input
                  type="number"
                  value={selectedLamp.lumens}
                  onChange={(e) => updateSelectedLamp('lumens', e.target.value)}
                  step="50"
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Угол рассеивания (°)</label>
                <input
                  type="number"
                  value={selectedLamp.angle}
                  onChange={(e) => updateSelectedLamp('angle', e.target.value)}
                  step="5"
                  min="30"
                  max="180"
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Высота установки (м)</label>
                <input
                  type="number"
                  value={selectedLamp.height}
                  onChange={(e) => updateSelectedLamp('height', e.target.value)}
                  step="0.5"
                  min="1"
                  max="5"
                />
              </div>

              <button className={styles.deleteBtn} onClick={deleteSelectedLamp}>
                Удалить лампу
              </button>
            </div>
          ) : selectedRoom ? (
            <div className={styles.card}>
              <h3>Параметры комнаты</h3>

              <div className={styles.inputGroup}>
                <label>Название</label>
                <input
                  type="text"
                  value={selectedRoom.name}
                  onChange={(e) => setRooms(prev => prev.map(r =>
                    r.id === selectedRoomId ? { ...r, name: e.target.value } : r
                  ))}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Ширина (м)</label>
                <input
                  type="number"
                  value={selectedRoom.width}
                  onChange={(e) => updateSelectedRoom('width', e.target.value)}
                  step="0.5"
                  min="1"
                  max="20"
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Глубина (м)</label>
                <input
                  type="number"
                  value={selectedRoom.height}
                  onChange={(e) => updateSelectedRoom('height', e.target.value)}
                  step="0.1"
                  min="1"
                  max="20"
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Высота потолков (м)</label>
                <input
                  type="number"
                  value={selectedRoom.ceilingHeight}
                  onChange={(e) => updateSelectedRoom('ceilingHeight', e.target.value)}
                  step="0.1"
                  min="2"
                  max="5"
                />
              </div>

              {rooms.length > 1 && (
                <button className={styles.deleteBtn} onClick={deleteSelectedRoom}>
                  Удалить комнату
                </button>
              )}
            </div>
          ) : (
            <div className={styles.card}>
              <h3>Параметры</h3>
              <p className={styles.hint}>Выберите комнату или лампу на плане для редактирования</p>
            </div>
          )}


          <div className={styles.card}>
            <h3>Общие расчёты</h3>
            <div className={styles.resultItem}>
              <span>Общая площадь:</span>
              <strong>{lighting.totalArea} м²</strong>
            </div>
            <div className={styles.resultItem}>
              <span>Общий объём:</span>
              <strong>{lighting.totalVolume} м³</strong>
            </div>
            <div className={styles.resultItem}>
              <span>Суммарный световой поток:</span>
              <strong>{lighting.totalLumens} Люмен</strong>
            </div>
            <div className={styles.resultItem}>
              <span>Суммарная мощность:</span>
              <strong>{lighting.totalWattage} Вт</strong>
            </div>
            <div className={styles.resultItem}>
              <span>Средняя освещённость:</span>
              <strong>{lighting.averageLux} Люкс</strong>
            </div>
            <div className={styles.resultItem}>
              <span>Количество лампочек:</span>
              <strong>{lighting.lampsCount} шт</strong>
            </div>
          </div>

          <div className={styles.card}>
            <h3>Проводка</h3>
            <div className={styles.resultItem}>
              <span>Общая длина проводов:</span>
              <strong>{wireLength} м</strong>
            </div>

            <div className={styles.resultItem}>
              <span>Количество проводов:</span>
              <strong>{wires.length} шт</strong>
            </div>

            <button
              className={`${styles.undoBtn} ${history.length === 0 ? styles.disabledBtn : ''}`}
              onClick={undoLastAction}
              disabled={history.length === 0}
            >
              Отменить последнее действие
            </button>

            <div className={styles.btnGroup}>
              <button className={styles.clearBtn} onClick={() => setShowClearWiresModal(true)}>
                Провода
              </button>
              <button className={styles.clearBtn} onClick={() => setShowClearLampsModal(true)} style={{ background: '#f39c12' }}>
                Лампы
              </button>
            </div>
          </div>
        </div>

        <div className={styles.canvasWrapper}>
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
          <div className={styles.scaleHint}>
            Сетка: 1 метр | Активный инструмент: {activeTool}
          </div>
        </div>
      </div>

      {/* Модальное окно подтверждения удаления проводов */}
      <ConfirmModal
        isOpen={showClearWiresModal}
        onClose={() => setShowClearWiresModal(false)}
        onConfirm={clearWires}
        title="Удаление всех проводов"
        message="Вы действительно хотите удалить все нарисованные провода? Это действие нельзя отменить."
        confirmText="Удалить провода"
      />

      {/* Модальное окно подтверждения удаления ламп */}
      <ConfirmModal
        isOpen={showClearLampsModal}
        onClose={() => setShowClearLampsModal(false)}
        onConfirm={clearLamps}
        title="Удаление всех ламп"
        message="Вы действительно хотите удалить все добавленные лампы? Это действие нельзя отменить."
        confirmText="Удалить лампы"
      />

    </div>
  );
};

export default LightingCalculator;
