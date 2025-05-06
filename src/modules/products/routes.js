// filepath: c:\Users\User\.AAAP\Vs-projects\ecommerce-api-ko-fi\src\modules\products\routes.js
const express = require('express');
const router = express.Router();
const { createProduct, archiveProduct, getProduct, getProducts, updateProduct} = require('./controllers/controller'); 
const { authenticate } = require('../../core/security/jwt');


router.post('/add', authenticate , createProduct);

router.get('/fetch/product/:id', getProduct);

router.get('/fetch/products', getProducts);

router.put('/update/:id', authenticate , updateProduct);

router.put('/archive/:id', authenticate , archiveProduct);


module.exports = router;