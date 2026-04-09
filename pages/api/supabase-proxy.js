export default async function handler(req, res) {
  const SUPABASE_URL = 'https://mutebkvjowivxupnexzp.supabase.co'
  
  try {
    // Получаем путь после /api/supabase-proxy/
    const path = req.url.replace(/^\/api\/supabase-proxy/, '')
    
    // Формируем целевой URL на Supabase
    const targetUrl = `${SUPABASE_URL}${path}`
    
    // Копируем все заголовки кроме хоста
    const headers = { ...req.headers }
    delete headers.host
    delete headers['content-length']
    
    // Делаем запрос к Supabase
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
      redirect: 'follow'
    })
    
    // Копируем заголовки ответа
    const responseHeaders = {}
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })
    
    // Разрешаем CORS для фронтенда
    responseHeaders['Access-Control-Allow-Origin'] = '*'
    responseHeaders['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS'
    responseHeaders['Access-Control-Allow-Headers'] = '*'
    
    // Отправляем ответ клиенту
    res.status(response.status)
    res.set(responseHeaders)
    
    const data = await response.arrayBuffer()
    res.send(Buffer.from(data))
    
  } catch (error) {
    console.error('Proxy error:', error)
    res.status(503).json({
      error: 'Proxy error',
      message: error.message
    })
  }
}

// Отключаем парсинг тела запроса чтобы прокси работало корректно
export const config = {
  api: {
    bodyParser: false,
    externalResolver: true
  }
}