const express = require('express');
const router = express.Router();
const campaignController = require('./controllers/controller');
const { authenticate } = require('../../core/security/jwt');
//const { validateRequest } = require('../../core/middlewares/schemaValidator');

// Campaign routes
router.post('/add', 
  authenticate, 
  campaignController.addCampaign
);

router.get('/get', 
  campaignController.getCampaigns
);

router.get('/get/:id', 
  authenticate, 
  campaignController.getCampaign
);

router.put('/update/:id', 
  authenticate, 
  campaignController.updateCampaign
);

router.delete('/delete/:id', 
  authenticate, 
  campaignController.deleteCampaign
);

module.exports = router;