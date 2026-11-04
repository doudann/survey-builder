const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Connexion requise.' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'Connexion requise.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Session invalide ou expirée.' });
  }
};