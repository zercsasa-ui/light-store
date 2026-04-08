export default async function handler(req, res) {
  // Получаем оригинальный путь запроса
  const path = req.url.replace('/api/supabase-proxy', '')
  
  // Актуальные рабочие зеркала Supabase на апрель 2026
  const mirrors = [
    'https://mutebkvjowivxupnexzp.supabase.co',
    'https://sg.supabase.co',
    'https://in.supabase.co', 
    'https://us-west-2.aws.supabase.co',
    'https://ap-southeast-1.aws.supabase.co'
  ]

  // Отправляем запрос параллельно на все зеркала сразу
  const promises = mirrors.map(mirror => 
    fetch(`${mirror}${path}`, {
      method: req.method,
      headers: {
        ...req.headers,
        host: new URL(mirror).host
      },
      body: req.method !== 'GET' ? req.body : undefined,
      redirect: 'follow'
    }).catch(() => null)
  )

  try {
    // Ждём первый успешный ответ
    const responses = await Promise.allSettled(promises)
    const successResponse = responses.find(r => r.status === 'fulfilled' && r.value.ok)

    if (successResponse) {
      const response = successResponse.value
      
      // Пересылаем все заголовки обратно
      response.headers.forEach((value, key) => {
        res.setHeader(key, value)
      })
      
      // Отправляем тело ответа
      res.status(response.status)
      response.body.pipe(res)
      return
    }
    
    throw new Error('Все зеркала не ответили')

  } catch (e) {
    res.status(503).json({ 
      error: 'Сервис временно недоступен',
      code: 'all_mirrors_failed'
    })
  }
}

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
    responseLimit: false
  }
}