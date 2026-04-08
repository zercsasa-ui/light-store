import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mutebkvjowivxupnexzp.supabase.co'
const supabaseKey = 'sb_publishable_oyu0Kmel3M15Am53sI_tzg_dZws5Hds'

// ✅ Резервные домены для обхода блокировок
const FALLBACK_DOMAINS = [
  'aws.supabase.co',
  'supabase.co',
  'c01.supabase.co'
]

let currentDomainIndex = 0

// ✅ Умный глобальный кеш с разным TTL для разных типов данных
const globalCache = new Map()

// Настройки времени жизни кеша в миллисекундах
const CACHE_TTL = {
  // Редко меняющиеся данные
  products:     24 * 60 * 60 * 1000,  // 24 ЧАСА
  categories:   24 * 60 * 60 * 1000,  // 24 ЧАСА
  contacts:   24 * 60 * 60 * 1000,    // 24 ЧАСА
  
  // Средняя частота изменений
  profiles:     15 * 60 * 1000,       // 15 минут (роли пользователей)
  requests:    5 * 60 * 1000,         // 5 минут (заявки)
  
  // Динамичные данные
  default:      30 * 1000             // 30 секунд по умолчанию
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    fetch: async (originalUrl, options = {}) => {
      const body = options.body ? JSON.parse(options.body) : {}
      const tableName = body.table
      
      // ✅ Обрабатываем только SELECT запросы (чтение данных)
      const isReadOperation = options.method !== 'POST' || body?.method === 'select'
      
      // ❌ Не кешируем мутации (запись, обновление, удаление)
      if (!isReadOperation || !tableName) {
        // При любом изменении данных сбрасываем кеш для этой таблицы
        if (tableName) {
          invalidateCacheForTable(tableName)
        }
        
        // ✅ Фоллбек доменов для мутаций
        for (let i = currentDomainIndex; i < FALLBACK_DOMAINS.length; i++) {
          try {
            const url = originalUrl.replace('supabase.co', FALLBACK_DOMAINS[i])
            return await fetch(url, options)
          } catch (e) {
            currentDomainIndex = (i + 1) % FALLBACK_DOMAINS.length
          }
        }
        
        throw new Error('Все резервные домены недоступны')
      }

      const cacheKey = `${tableName}:${JSON.stringify(body)}`
      
      // Проверяем есть ли актуальные данные в кеше
      if (globalCache.has(cacheKey)) {
        const cached = globalCache.get(cacheKey)
        if (Date.now() < cached.expires) {
          // Возвращаем кеш сразу, а в фоне пытаемся обновить
          setTimeout(async () => {
            try {
              const response = await fetch(originalUrl, { ...options, signal: AbortSignal.timeout(3000) })
              const freshData = await response.json()
              globalCache.set(cacheKey, {
                data: freshData,
                expires: Date.now() + (CACHE_TTL[tableName] || CACHE_TTL.default)
              })
            } catch (e) {
              // Тихо игнорируем, у нас есть актуальный кеш
            }
          }, 0)
          
          return new Response(JSON.stringify(cached.data))
        }
        globalCache.delete(cacheKey)
      }

      // ✅ Пробуем все резервные домены по порядку
      for (let i = currentDomainIndex; i < FALLBACK_DOMAINS.length; i++) {
        try {
          const url = originalUrl.replace('supabase.co', FALLBACK_DOMAINS[i])
          const response = await fetch(url, { ...options, signal: AbortSignal.timeout(7000) })
          const data = await response.clone().json()
          
          // Сохраняем в кеш с соответствующим TTL
          const ttl = CACHE_TTL[tableName] || CACHE_TTL.default
          globalCache.set(cacheKey, {
            data,
            expires: Date.now() + ttl
          })
          
          // Запоминаем рабочий домен для следующих запросов
          currentDomainIndex = i
          
          return response
        } catch (e) {
          console.log(`Домен ${FALLBACK_DOMAINS[i]} недоступен, пробуем следующий`)
          currentDomainIndex = (i + 1) % FALLBACK_DOMAINS.length
        }
      }

      // ✅ Если все домены упали - возвращаем даже устаревший кеш
      for (const [key, cached] of globalCache) {
        if (key === cacheKey) {
          console.log('⚠️ Использую устаревший кеш, база недоступна')
          return new Response(JSON.stringify(cached.data))
        }
      }

      throw new Error('Нет соединения с базой данных')
    }
  }
})

// ✅ Автоматическая инвалидация кеша при изменении данных
function invalidateCacheForTable(tableName) {
  for (const [key] of globalCache) {
    if (key.startsWith(`${tableName}:`)) {
      globalCache.delete(key)
    }
  }
  console.log(`🔄 Кеш для таблицы ${tableName} очищен`)
}

// ✅ Ручная очистка всего кеша при необходимости
export const clearAllCache = () => {
  globalCache.clear()
  console.log('🗑️ Весь кеш очищен')
}

// ✅ Функция для предзагрузки каталога (используется в сайдбаре)
export const preloadCatalog = async () => {
  try {
    await Promise.all([
      supabase.from('products').select('*, categories(name)').limit(200),
      supabase.from('categories').select('*')
    ])
    console.log('✅ Каталог предзагружен в кеш')
  } catch (e) {
    // Тихо игнорируем ошибки предзагрузки
  }
}
