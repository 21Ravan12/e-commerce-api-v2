const PromotionCode = require('../../models/PromotionCode');
const Order = require('../../models/Order');
const Product = require('../../models/Products');
const logger = require('../../services/logger');

/**
 * Calculate tax based on subtotal and shipping address
 * @param {number} subtotal - Order subtotal amount
 * @param {object} shippingAddress - Customer shipping address
 * @returns {Promise<number>} Calculated tax amount
 */
async function calculateTax(subtotal, shippingAddress) {
    try {
        // Simplified example - 10% flat tax
        const taxRate = 0.1;
        const taxAmount = subtotal * taxRate;

        logger.debug(`Calculated tax: ${taxAmount} for subtotal: ${subtotal}`);
        return taxAmount;
    } catch (error) {
        logger.error(`Tax calculation failed: ${error.message}`);
        throw new Error('Tax calculation service unavailable');
    }
}

/**
 * Calculate shipping costs based on method
 * @param {string} shippingMethod - Selected shipping method
 * @returns {Promise<number>} Shipping cost
 */
async function calculateShipping(shippingMethod) {
    const shippingRates = {
        standard: 5.99,
        express: 15.99,
        overnight: 25.99
    };

    if (!shippingRates.hasOwnProperty(shippingMethod)) {
        logger.warn(`Unknown shipping method: ${shippingMethod}, using standard`);
        return shippingRates.standard;
    }

    return shippingRates[shippingMethod];
}

/**
 * Calculates the delivery date based on order date and shipping method
 * @param {Date|string} orderDate - The date the order was placed
 * @param {'standard'|'express'|'overnight'} shippingMethod - Shipping method
 * @returns {string} ISO string of the delivery date
 * @throws {Error} If invalid orderDate is provided
 */
function calculateDeliveryDate(orderDate, shippingMethod) {
    const parsedDate = new Date(orderDate);
    if (isNaN(parsedDate.getTime())) {
        throw new Error('Invalid order date provided');
    }

    const DELIVERY_DAYS = {
        standard: 5,
        express: 3,
        overnight: 1
    };

    const daysToAdd = DELIVERY_DAYS[shippingMethod] || DELIVERY_DAYS.standard;

    const deliveryDate = new Date(parsedDate);
    let businessDaysAdded = 0;

    while (businessDaysAdded < daysToAdd) {
        deliveryDate.setDate(deliveryDate.getDate() + 1);
        const dayOfWeek = deliveryDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            businessDaysAdded++;
        }
    }

    return deliveryDate.toISOString();
}

async function validateAndApplyPromotion(promotionCode, userId, cartItems, subtotal) {
    if (!promotionCode) {
        return { discount: 0, promotionDetails: null };
    }

    // Find active promotion using the schema's static method
    const promotion = await PromotionCode.findOne({
        promotionCode: promotionCode.toUpperCase(),
        status: "active",
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() }
    });

    if (!promotion) {
        throw new Error('Invalid promotion code');
    }

    // Check customer eligibility
    if (promotion.customerEligibility === 'specific_customers' && 
        !promotion.eligibleCustomers.includes(userId)) {
        throw new Error('You are not eligible for this promotion');
    }

    // Check single use per customer
    if (promotion.singleUsePerCustomer) {
        const hasUsedBefore = await Order.exists({
            idCustomer: userId,
            'promotion.promotionId': promotion._id
        });
        if (hasUsedBefore) {
            throw new Error('This promotion can only be used once per customer');
        }
    }

    // Check usage limits
    if (promotion.usageLimit && promotion.usageCount >= promotion.usageLimit) {
        throw new Error('Promotion code has reached its usage limit');
    }

    // Check minimum purchase amount
    if (promotion.minPurchaseAmount && subtotal < promotion.minPurchaseAmount) {
        throw new Error(`Promotion requires a minimum purchase of ${promotion.minPurchaseAmount}`);
    }

    // Check applicable products/categories
    if (promotion.applicableCategories && promotion.applicableCategories.length > 0) {
        const applicableCategoryIds = promotion.applicableCategories.map(id => id.toString());
        const cartProductIds = cartItems.map(item => item.product._id);
        const products = await Product.find({ _id: { $in: cartProductIds } }).select('categories');
        const hasApplicableCategory = products.some(product =>
            product.categories.some(cat => applicableCategoryIds.includes(cat.toString()))
        );
        
        if (!hasApplicableCategory) {
            throw new Error('Promotion code not applicable to cart categories');
        }
    }

    // Check excluded products
    if (promotion.excludedProducts && promotion.excludedProducts.length > 0) {
        const excludedProductIds = promotion.excludedProducts.map(id => id.toString());
        const hasExcludedProduct = cartItems.some(item => 
            excludedProductIds.includes(item.product._id.toString())
        );
        if (hasExcludedProduct) {
            throw new Error('Promotion cannot be used with some items in your cart');
        }
    }

    // Calculate discount based on promotion type
    let discount = 0;
    let freeShipping = false;

    switch (promotion.promotionType) {
        case 'fixed':
            discount = promotion.promotionAmount;
            break;
        case 'percentage':
            discount = subtotal * (promotion.promotionAmount / 100);
            if (promotion.maxDiscountAmount) {
                discount = Math.min(discount, promotion.maxDiscountAmount);
            }
            break;
        case 'free_shipping':
            freeShipping = true;
            break;
        case 'bundle':
            // Implement bundle logic if needed
            break;
        default:
            break;
    }

    const promotionDetails = {
        code: promotion.promotionCode,
        name: promotion.name || promotion.promotionCode,
        promotionType: promotion.promotionType,
        promotionAmount: promotion.promotionAmount,
        appliedDiscount: discount,
        promotionId: promotion._id,
        maxDiscountAmount: promotion.maxDiscountAmount,
        freeShipping: freeShipping
    };

    return {
        discount,
        promotionDetails
    };
}

async function updatePromotionUsage(promotionId) {
    if (!promotionId) return;

    await PromotionCode.findByIdAndUpdate(
        promotionId,
        { 
            $inc: { usageCount: 1 },
            $addToSet: { usedBy: userId }
        },
        { new: true }
    );
}

module.exports = {
    calculateTax,
    calculateShipping,
    calculateDeliveryDate,
    validateAndApplyPromotion,
    updatePromotionUsage
};