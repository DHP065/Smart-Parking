const roleGuard = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}`
      });
    }

    next();
  };
};

module.exports = roleGuard;
