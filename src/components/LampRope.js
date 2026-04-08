import React, { useEffect, useRef, useState } from 'react';

const LampRope = () => {
  const canvasRef = useRef(null);
  const [isAttached, setIsAttached] = useState(() => {
    const saved = localStorage.getItem('lamp_attached');
    return saved === 'true';
  });
  const [isLocked, setIsLocked] = useState(() => {
    const saved = localStorage.getItem('lamp_locked');
    return saved === 'true';
  });

  useEffect(() => {
    if (isAttached) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
    localStorage.setItem('lamp_attached', isAttached.toString());
  }, [isAttached]);

  useEffect(() => {
    localStorage.setItem('lamp_locked', isLocked.toString());
  }, [isLocked]);

  function cut(start, end, ratio) {
    const r1 = {
      x: start.x * (1 - ratio) + end.x * ratio,
      y: start.y * (1 - ratio) + end.y * ratio,
    };
    const r2 = {
      x: start.x * ratio + end.x * (1 - ratio),
      y: start.y * ratio + end.y * (1 - ratio),
    };
    return [r1, r2];
  }

  function chaikin(curve, iterations = 1, closed = false, ratio = 0.25) {
    if (ratio > 0.5) {
      ratio = 1 - ratio;
    }

    for (let i = 0; i < iterations; i++) {
      let refined = [];
      refined.push(curve[0]);

      for (let j = 1; j < curve.length; j++) {
        let points = cut(curve[j - 1], curve[j], ratio);
        refined = refined.concat(points);
      }

      if (closed) {
        refined.shift();
        refined = refined.concat(cut(curve[curve.length - 1], curve[0], ratio));
      } else {
        refined.push(curve[curve.length - 1]);
      }

      curve = refined;
    }
    return curve;
  }

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = 140;
    canvas.height = 450;

    const topPoint = { x: 45, y: 52 };
    const socketPoint = { x: 88, y: 158 };

    const points = [];
    const segmentsCount = 12;

    for (let i = 0; i <= segmentsCount; i++) {
      points.push({
        x: topPoint.x,
        y: topPoint.y + (i * 140) / segmentsCount,
        oldx: topPoint.x,
        oldy: topPoint.y + (i * 140) / segmentsCount,
      });
    }

    let attached = false;
    let locked = false;
    let mousePos = null;

    function updatePhysics() {
      points[0].x = topPoint.x;
      points[0].y = topPoint.y;

      if (attached) {
        points[points.length - 1].x = socketPoint.x;
        points[points.length - 1].y = socketPoint.y;
      }

      for (let i = 1; i < points.length; i++) {
        if (attached && i === points.length - 1) continue;

        const vx = (points[i].x - points[i].oldx) * 0.96;
        const vy = (points[i].y - points[i].oldy) * 0.96;

        points[i].oldx = points[i].x;
        points[i].oldy = points[i].y;

        points[i].x += vx;
        points[i].y += vy + 0.4;

        if (mousePos && !attached && i === points.length - 1) {
          const dx = mousePos.x - points[i].x;
          const dy = mousePos.y - points[i].y;
          points[i].x += dx * 0.15;
          points[i].y += dy * 0.15;
        }
      }

      for (let iter = 0; iter < 5; iter++) {
        for (let i = 1; i < points.length; i++) {
          const dx = points[i].x - points[i - 1].x;
          const dy = points[i].y - points[i - 1].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 140 / segmentsCount;

          if (dist > maxDist) {
            const diff = (dist - maxDist) / dist;
            const offsetX = dx * diff * 0.5;
            const offsetY = dy * diff * 0.5;

            if (i !== 1) {
              points[i - 1].x += offsetX;
              points[i - 1].y += offsetY;
            }

            if (!(attached && i === points.length - 1)) {
              points[i].x -= offsetX;
              points[i].y -= offsetY;
            }
          }
        }
      }

      if (!attached && !locked) {
        const endPoint = points[points.length - 1];
        const dx = endPoint.x - socketPoint.x;
        const dy = endPoint.y - socketPoint.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 12) {
          attached = true;
          setIsAttached(true);
          mousePos = null;
          points[points.length - 1].x = socketPoint.x;
          points[points.length - 1].y = socketPoint.y;
          points[points.length - 1].oldx = socketPoint.x;
          points[points.length - 1].oldy = socketPoint.y;
        }
      }
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);

      const smoothPoints = chaikin(points, 2);

      for (let i = 1; i < smoothPoints.length; i++) {
        ctx.lineTo(smoothPoints[i].x, smoothPoints[i].y);
      }

      ctx.lineWidth = 4;
      ctx.strokeStyle = attached ? '#fff9e6' : '#333333';
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    function animate() {
      requestAnimationFrame(animate);
      updatePhysics();
      draw();
    }
    animate();

    // Слушаем мышь на всём окне но ограничиваем область слежки прямоугольником 50px по X / 300px по Y
    const handleGlobalMouseMove = (e) => {
      if (attached) return;
      
      const rect = canvas.getBoundingClientRect();
      const lampX = rect.left;
      const lampY = rect.top;
      
      // Прямоугольная зона слежки
      const isInZone = 
        e.clientX >= lampX - 50 && e.clientX <= lampX + 140 &&
        e.clientY >= lampY && e.clientY <= lampY + 300;
      
      // Только если курсор в пределах зоны и не заблокировано - следим
      if (isInZone && !locked) {
        mousePos = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
      } else {
        mousePos = null;
      }
    };

    const handleGlobalMouseUp = () => {
      mousePos = null;
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    if (isLocked) {
      locked = true;
    } else {
      locked = false;
    }

    if (isAttached) {
      attached = true;
    } else {
      attached = false;
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAttached, isLocked]);

  return (
    <>
    {window.innerWidth <= 720 ? (
      <div
        onClick={() => {
          const current = document.documentElement.getAttribute('data-theme');
          document.documentElement.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
        }}
        style={{
          position: 'fixed',
          top: '15px',
          right: '15px',
          zIndex: '9999',
          width: '40px',
          height: '40px',
          cursor: 'pointer',
          backgroundColor: 'var(--text-primary)',
          maskImage: 'url(/images/ico/lampTheme.png)',
          maskSize: 'contain',
          WebkitMaskImage: 'url(/images/ico/lampTheme.png)',
          WebkitMaskSize: 'contain'
        }}
      />
    ) : (
    <div style={{
      position: 'fixed',
      top: '0px',
      right: '15px',
      zIndex: '90',
      width: '90px',
      height: '250px',
      pointerEvents: 'none'
    }}>
      <div
        onClick={() => {
          setIsLocked(!isLocked);
        }}
        style={{
          position: 'absolute',
          left: 25,
          top: 20,
          width: '40px',
          height: '40px',
          zIndex: 10,
          pointerEvents: 'auto',
          cursor: 'pointer',
          backgroundColor: isAttached ? '#fff9e6' : '#333333',
          transition: 'background-color 0.3s ease',
          maskImage: 'url(/images/ico/lampTheme.png)',
          maskSize: 'contain',
          maskRepeat: 'no-repeat',
          WebkitMaskImage: 'url(/images/ico/lampTheme.png)',
          WebkitMaskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          opacity: isLocked ? 0.5 : 1
        }}
        title={isLocked ? "Включить слежку за курсором" : "Отключить слежку за курсором"}
      />

      <div
        onClick={(e) => {
          e.stopPropagation();
          if (isAttached) {
            setIsAttached(false);
            setIsLocked(true);

            setTimeout(() => {
              setIsLocked(false);
            }, 2000);
          }
        }}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          right: 5,
          top: 150,
          width: 20,
          height: 20,
          zIndex: 90,
          pointerEvents: 'auto',
          cursor: 'pointer',
          opacity: isLocked ? 0.7 : 1,
          backgroundColor: isAttached ? '#fff9e6' : '#333333',
          transition: 'background-color 0.3s ease',
          maskImage: 'url(/images/ico/rozetkaIco.png)',
          maskSize: 'contain',
          maskRepeat: 'no-repeat',
          WebkitMaskImage: 'url(/images/ico/rozetkaIco.png)',
          WebkitMaskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          boxShadow: 'none'
        }} />

      <canvas ref={canvasRef} width="90" height="250" style={{ pointerEvents: 'none' }} />
    </div>
    )}
    </>
  );
};

export default LampRope;