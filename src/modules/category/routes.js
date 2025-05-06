// filepath: c:\Users\User\.AAAP\Vs-projects\ecommerce-api-ko-fi\src\modules\auth\routes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../../core/security/jwt');
const { addCategory, updateCategory, fetchCategory, fetchCategories, deleteCategory } = require('./controllers/controller'); 


router.post('/add', authenticate , addCategory);

router.get('/fetch/:id', fetchCategory);

router.get('/fetch', fetchCategories);

router.put('/update/:id', authenticate , updateCategory);

router.delete('/delete/:id', authenticate , deleteCategory);


module.exports = router;