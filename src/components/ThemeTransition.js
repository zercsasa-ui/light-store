import { useState, useEffect, useRef } from 'react';

const ThemeTransition = () => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [clipRadius, setClipRadius] = useState(0);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const animationRef = useRef(null);

  useEffect(() => {
    const handleThemeChange = async (e) => {
      if (isAnimating) return;

      e.stopImmediatePropagation();
      e.preventDefault();

      const buttonRect = e.target.getBoundingClientRect();
      const centerX = buttonRect.left + buttonRect.width / 2;
      const centerY = buttonRect.top + buttonRect.height / 2;

      setOrigin({ x: centerX, y: centerY });
      setClipRadius(0);
      setIsAnimating(true);

      // ✅ Реальная анимация расширяющегося круга
      const maxRadius = Math.hypot(
        Math.max(centerX, window.innerWidth - centerX),
        Math.max(centerY, window.innerHeight - centerY)
      );

      const startTime = performance.now();
      const duration = 1200;

      const animate = (now) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 2.5);
        
        setClipRadius(maxRadius * easeProgress);

        if (progress < 0.4 && !document.documentElement.getAttribute('data-theme-switched')) {
          document.documentElement.setAttribute('data-theme-switched', 'true');
          const current = document.documentElement.getAttribute('data-theme');
          document.documentElement.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
        }

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          document.documentElement.removeAttribute('data-theme-switched');
          setIsAnimating(false);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    };

    setTimeout(() => {
      const lampButton = document.querySelector('[mask-image*="lampTheme"]');
      if (lampButton) {
        lampButton.onclick = null;
        lampButton.addEventListener('click', handleThemeChange, true);
      }
    }, 100);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isAnimating]);

  if (!isAnimating) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999999,
        pointerEvents: 'none',
        mixBlendMode: 'normal'
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          clipPath: `circle(${clipRadius}px at ${origin.x}px ${origin.y}px)`,
          backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#0f172a' : '#ffffff',
          transition: 'none'
        }}
      />
    </div>
  );
};

export default ThemeTransition;