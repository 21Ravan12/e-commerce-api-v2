const express = require('express');
const router = express.Router();
const promotionCodeController = require('./controllers/controller');
const { authenticate } = require('../../core/security/jwt');
//const { validate } = require('../../../middleware/validate');

router.post('/add', 
  authenticate, 
  promotionCodeController.addPromotionCode
);

router.get('/get', 
  promotionCodeController.getPromotionCodes
);

router.get('/get/:id', 
  authenticate, 
  promotionCodeController.getPromotionCode
);

router.put('/update/:id', 
  authenticate, 
  promotionCodeController.updatePromotionCode
);

router.delete('/delete/:id', 
  authenticate, 
  promotionCodeController.deletePromotionCode
);

module.exports = router;