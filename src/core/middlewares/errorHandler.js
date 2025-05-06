// filepath: c:\Users\User\.AAAP\Vs-projects\ecommerce-api-ko-fi\src\core\middlewares\errorHandler.js
module.exports = (err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
};