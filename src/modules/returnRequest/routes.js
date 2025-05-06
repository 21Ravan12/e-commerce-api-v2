const express = require('express');
const router = express.Router();
const returnRequestController = require('./controllers/controller');
const { authenticate } = require('../../core/security/jwt');
//const { validate } = require('../../../middleware/validate');

router.post('/add', 
  authenticate, 
  returnRequestController.createReturnRequest
);

router.get('/get', 
  authenticate, 
  returnRequestController.getReturnRequests
);

router.get('/get/:id', 
  authenticate, 
  returnRequestController.getReturnRequest
);

router.put('/update/:id', 
  authenticate, 
  returnRequestController.updateReturnRequest
);

router.put('/update-admin/:id', 
  authenticate, 
  returnRequestController.reviewAndUpdateReturnRequest
);

router.put('/archive/:id', 
  authenticate, 
  returnRequestController.archiveReturnRequest
);

module.exports = router;