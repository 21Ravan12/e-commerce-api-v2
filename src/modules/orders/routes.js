const express = require('express');
const router = express.Router();
const orderController = require('./controllers/controller');
const { authenticate } = require('../../core/security/jwt');

router.post('/add', 
  authenticate, 
  orderController.createOrder
);

router.get('/get', 
  authenticate, 
  orderController.getOrders
);

router.get('/get/:orderId', 
  authenticate, 
  orderController.getOrderDetails
);

router.get('/admin-get', 
  authenticate, 
  orderController.getAdminOrders
);

router.put('/cancel/:id', 
  authenticate, 
  orderController.cancelOrder
);

router.put('/admin-update/:id', 
  authenticate, 
  orderController.updateAdminOrders
);

module.exports = router;