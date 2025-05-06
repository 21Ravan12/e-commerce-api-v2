const mongoose = require('mongoose');
const AuditLog = require('../../../models/AuditLog');
const Product = require('../../../models/Products');
const Order = require('../../../models/Order');
const logger = require('../../../services/logger');
const User = require('../../../models/User');


class CommerceController {
  constructor() {
    this.getWishlist = this.getWishlist.bind(this);
    this.getCart = this.getCart.bind(this);
  }

  // ==================== WISHLIST OPERATIONS ====================

  async addToWishlist(req, res) {
    try {
      const { productId } = req.body;
      const userId = req.user._id;
  
      const result = await User.addToWishlist(userId, productId);
      
      // Create detailed audit log
      await AuditLog.logAsync({
        event: 'WISHLIST_ADD',
        user: userId,
        action: 'create',
        source: 'api',
        status: 'success',
        ip: req.ip,
        userAgent: req.get('User-Agent')?.slice(0, 200) || '',
        metadata: {
          productId,
          productName: result.productDetails.name,
          productPrice: result.productDetails.price
        }
      });
  
      res.status(200).json(result);
    } catch (error) {
      // Create error audit log
      await AuditLog.logAsync({
        event: 'WISHLIST_ADD',
        user: req.user?._id,
        action: 'create',
        source: 'api',
        status: 'failure',
        ip: req.ip,
        userAgent: req.get('User-Agent')?.slice(0, 200) || '',
        metadata: {
          error: error.message,
          productId: req.body.productId
        }
      });
  
      logger.error(`Error adding to wishlist: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }
  
  async removeFromWishlist(req, res) {
    try {
      const { productId } = req.params;
      const userId = req.user._id;
  
      const result = await User.removeFromWishlist(userId, productId);
      
      // Create detailed audit log
      await AuditLog.logAsync({
        event: 'WISHLIST_REMOVE',
        user: userId,
        action: 'delete',
        source: 'api',
        status: 'success',
        ip: req.ip,
        userAgent: req.get('User-Agent')?.slice(0, 200) || '',
        metadata: {
          productId,
          productName: result.productDetails.name,
          productPrice: result.productDetails.price
        }
      });
  
      res.status(200).json(result);
    } catch (error) {
      // Create error audit log
      await AuditLog.logAsync({
        event: 'WISHLIST_REMOVE',
        user: req.user?._id,
        action: 'delete',
        source: 'api',
        status: 'failure',
        ip: req.ip,
        userAgent: req.get('User-Agent')?.slice(0, 200) || '',
        metadata: {
          error: error.message,
          productId: req.params.productId
        }
      });
  
      logger.error(`Error removing from wishlist: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }

  async getWishlist(req, res) {
    try {
        const userId = req.user._id;

        const data = {
          id: userId
        };

        const user = await User.updateUser(userId, data);

        // Create audit log for access
        await AuditLog.logAsync({
            event: 'WISHLIST_ACCESS',
            user: userId,
            action: 'read',
            source: 'api',
            status: 'success',
            ip: req.ip,
            userAgent: req.get('User-Agent')?.slice(0, 200) || '',
            metadata: {
                itemCount: user.commerce.wishlist.length
            }
        });

        res.status(200).json({
            wishlist: user.commerce.wishlist,
            count: user.commerce.wishlist.length
        });
    } catch (error) {
        // Create error audit log
        await AuditLog.logAsync({
            event: 'WISHLIST_ACCESS',
            user: req.user?._id,
            action: 'read',
            source: 'api',
            status: 'failure',
            ip: req.ip,
            userAgent: req.get('User-Agent')?.slice(0, 200) || '',
            metadata: {
                error: error.message
            }
        });

        logger.error(`Error fetching wishlist: ${error.message}`);
        res.status(500).json({ error: 'Failed to fetch wishlist' });
    }
  }

  // ==================== CART OPERATIONS ====================

  async addToCart(req, res) {
    try {
      const { productId, quantity, size, color } = req.body;
      const userId = req.user._id;
  
      const result = await User.addToCart(userId, productId, quantity, { size, color });
      
      await AuditLog.logAsync({
        event: 'CART_ADD',
        user: userId,
        action: 'create',
        source: 'api',
        status: 'success',
        ip: req.ip,
        userAgent: req.get('User-Agent')?.slice(0, 200) || '',
        metadata: {
          productId,
          productName: result.productDetails.name,
          quantity: result.productDetails.quantity,
          size,
          color
        }
      });
  
      res.status(200).json(result);
    } catch (error) {
      await AuditLog.logAsync({
        event: 'CART_ADD',
        user: req.user?._id,
        action: 'create',
        source: 'api',
        status: 'failure',
        ip: req.ip,
        userAgent: req.get('User-Agent')?.slice(0, 200) || '',
        metadata: {
          error: error.message,
          productId: req.body.productId
        }
      });
  
      logger.error(`Error adding to cart: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }
  
  async updateCartItem(req, res) {
    try {
      const { itemId } = req.params;
      const updates = req.body;
      const userId = req.user._id;
  
      const result = await User.updateCartItem(userId, itemId, updates);
      
      await AuditLog.logAsync({
        event: 'CART_UPDATE',
        user: userId,
        action: 'update',
        source: 'api',
        status: 'success',
        ip: req.ip,
        userAgent: req.get('User-Agent')?.slice(0, 200) || '',
        metadata: {
          itemId,
          productId: result.itemDetails.productId,
          quantity: result.itemDetails.quantity,
          size: result.itemDetails.size,
          color: result.itemDetails.color
        }
      });
  
      res.status(200).json(result);
    } catch (error) {
      await AuditLog.logAsync({
        event: 'CART_UPDATE',
        user: req.user?._id,
        action: 'update',
        source: 'api',
        status: 'failure',
        ip: req.ip,
        userAgent: req.get('User-Agent')?.slice(0, 200) || '',
        metadata: {
          error: error.message,
          itemId: req.params.itemId
        }
      });
  
      logger.error(`Error updating cart item: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }
  
  async removeFromCart(req, res) {
    try {
      const { itemId } = req.params;
      const userId = req.user._id;
  
      const result = await User.removeFromCart(userId, itemId);
      
      await AuditLog.logAsync({
        event: 'CART_REMOVE',
        user: userId,
        action: 'delete',
        source: 'api',
        status: 'success',
        ip: req.ip,
        userAgent: req.get('User-Agent')?.slice(0, 200) || '',
        metadata: {
          itemId,
          productId: result.itemDetails.productId,
          quantity: result.itemDetails.quantity
        }
      });
  
      res.status(200).json(result);
    } catch (error) {
      await AuditLog.logAsync({
        event: 'CART_REMOVE',
        user: req.user?._id,
        action: 'delete',
        source: 'api',
        status: 'failure',
        ip: req.ip,
        userAgent: req.get('User-Agent')?.slice(0, 200) || '',
        metadata: {
          error: error.message,
          itemId: req.params.itemId
        }
      });
  
      logger.error(`Error removing from cart: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }
  
  async clearCart(req, res) {
    try {
      const userId = req.user._id;
  
      const result = await User.clearCart(userId);
      
      await AuditLog.logAsync({
        event: 'CART_CLEAR',
        user: userId,
        action: 'delete',
        source: 'api',
        status: 'success',
        ip: req.ip,
        userAgent: req.get('User-Agent')?.slice(0, 200) || '',
        metadata: {
          itemsRemoved: result.itemsRemoved
        }
      });
  
      res.status(200).json(result);
    } catch (error) {
      await AuditLog.logAsync({
        event: 'CART_CLEAR',
        user: req.user?._id,
        action: 'delete',
        source: 'api',
        status: 'failure',
        ip: req.ip,
        userAgent: req.get('User-Agent')?.slice(0, 200) || '',
        metadata: {
          error: error.message
        }
      });
  
      logger.error(`Error clearing cart: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }

  async getCart(req, res) {
    try {
      const userId = req.user._id;
  
      // Check if user is suspended
      if (req.user.status === 'suspended') {
        return res.status(403).json({ error: 'Account suspended. Cannot access cart.' });
      }
  
      // Use getCartItems with population
      const cartData = await User.getCartItems(userId, {
        populate: true,
        productFields: 'name price images stock' // Only get needed fields
      });
  
      // Create audit log for cart access
      await AuditLog.logAsync({
        event: 'CART_ACCESS',
        user: userId,
        action: 'read',
        source: 'api',
        status: 'success',
        ip: req.ip,
        userAgent: req.get('User-Agent')?.slice(0, 200) || '',
        metadata: {
          itemCount: cartData.items.length,
          totalValue: cartData.total,
          products: cartData.items.map(item => ({
            productId: item.product._id,
            name: item.product.name,
            quantity: item.quantity
          }))
        }
      });
  
      res.status(200).json(cartData);
    } catch (error) {
      // Error audit log
      await AuditLog.logAsync({
        event: 'CART_ACCESS',
        user: req.user?._id,
        action: 'read',
        source: 'api',
        status: 'failure',
        ip: req.ip,
        userAgent: req.get('User-Agent')?.slice(0, 200) || '',
        metadata: {
          error: error.message
        }
      });
  
      logger.error(`Error fetching cart: ${error.message}`);
      res.status(500).json({ error: 'Failed to fetch cart' });
    }
  }
}

module.exports = new CommerceController();