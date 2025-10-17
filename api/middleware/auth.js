const jwt = require('jsonwebtoken');

/**
 * Проверяет JWT токен из заголовка Authorization
 * Возвращает расшифрованные данные пользователя или null
 */
function verifyToken(req) {
  try {
    // Получаем токен из заголовка Authorization: Bearer <token>
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return null;
    }

    // Извлекаем токен (убираем "Bearer ")
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return null;
    }

    // Проверяем и расшифровываем токен
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Возвращаем данные пользователя из токена
    // decoded содержит: { user_id, username, role_id, role_name }
    return decoded;
    
  } catch (error) {
    // Токен невалидный, истек, или подделан
    console.error('Token verification failed:', error.message);
    return null;
  }
}

module.exports = { verifyToken };