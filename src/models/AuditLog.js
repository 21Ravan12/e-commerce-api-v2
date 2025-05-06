const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');

const auditLogSchema = new Schema({
  // Core Fields
  event: {
    type: String,
    required: [true, 'Event type is required'],
    minlength: [1, 'Event type must be at least 1 character'],
    maxlength: [100, 'Event type cannot exceed 100 characters'],
    trim: true,
    index: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  userEmail: {
    type: String,
    index: true,
    trim: true,
    lowercase: true
  },
  ip: {
    type: String,
    required: [true, 'IP address is required'],
    validate: {
      validator: function(v) {
        // Validate IPv4, IPv6, and localhost variants
        return /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^127\.0\.0\.1$/.test(v);
      },
      message: props => `${props.value} is not a valid IP address!`
    }
  },
  userAgent: {
    type: String,
    required: [true, 'User agent is required'],
    maxlength: [512, 'User agent cannot exceed 512 characters']
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  status: {
    type: String,
    enum: ['success', 'failure', 'warning', 'info', 'pending'],
    default: 'info',
    index: true
  },
  source: {
    type: String,
    enum: ['web', 'mobile', 'api', 'admin', 'system', 'cli'],
    required: [true, 'Source is required'],
    index: true,
    lowercase: true
  },
  action: {
    type: String,
    enum: ['create', 'read', 'update', 'delete', 'login',
       'logout', 'auth', 'register', 'verify', 'reset_request',
        'password_reset', 'reset_verify', 'other', 'initiate',
         'link', 'unlink', 'read', 'cancel', 'payment', 'refund'
         ,'enable_mfa', 'mfa_failure', 'reset_verify', 'disable_mfa', 'mfa_success'],
    required: [true, 'Action type is required'],
    index: true,
    lowercase: true
  },
  entityType: {
    type: String,
    maxlength: [50, 'Entity type cannot exceed 50 characters'],
    index: true
  },
  entityId: {
    type: Schema.Types.ObjectId,
    index: true
  },
  correlationId: {
    type: String,
    default: uuidv4
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes for performance
auditLogSchema.index({ event: 1, status: 1 });
auditLogSchema.index({ user: 1, timestamp: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ source: 1, action: 1 });
auditLogSchema.index({ correlationId: 1 });

// Virtual for human-readable timestamp
auditLogSchema.virtual('humanTime').get(function() {
  return this.timestamp.toLocaleString();
});

// Virtual for simplified log message
auditLogSchema.virtual('logMessage').get(function() {
  return `[${this.source.toUpperCase()}] ${this.event}: ${this.status}`;
});

// Static Methods
auditLogSchema.statics.logAsync = async function(logData) {
  try {
    const logEntry = new this({
      event: logData.event,
      user: logData.user,
      userEmail: logData.userEmail,
      ip: logData.ip,
      userAgent: logData.userAgent,
      metadata: logData.metadata || {},
      status: logData.status || 'info',
      source: (logData.source || 'system').toLowerCase(),
      action: (logData.action || 'other').toLowerCase(),
      entityType: logData.entityType,
      entityId: logData.entityId,
      correlationId: logData.correlationId || uuidv4()
    });

    await logEntry.save();
    return logEntry;
  } catch (err) {
    console.error('AuditLog error:', err);
    // Fallback logging
    console.error('Failed audit log data:', logData);
    return null;
  }
};

// Query Helpers
auditLogSchema.query.byUser = function(userId) {
  return this.where({ user: userId });
};

auditLogSchema.query.byEmail = function(email) {
  return this.where({ userEmail: email.toLowerCase() });
};

auditLogSchema.query.byEvent = function(event) {
  return this.where({ event });
};

auditLogSchema.query.recent = function(days = 7) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return this.where('timestamp').gte(cutoff);
};

auditLogSchema.query.byCorrelationId = function(correlationId) {
  return this.where({ correlationId });
};

// Instance Methods
auditLogSchema.methods.getMetadataValue = function(key) {
  return this.metadata?.[key];
};

auditLogSchema.methods.isSuccessful = function() {
  return this.status === 'success';
};

auditLogSchema.methods.toSimplifiedObject = function() {
  return {
    event: this.event,
    status: this.status,
    timestamp: this.timestamp,
    source: this.source,
    action: this.action,
    message: this.logMessage
  };
};

// Pre-save hook to clean data
auditLogSchema.pre('save', function(next) {
  // Trim all string fields
  if (this.event) this.event = this.event.trim();
  if (this.userAgent) this.userAgent = this.userAgent.substring(0, 512);
  if (this.userEmail) this.userEmail = this.userEmail.toLowerCase().trim();
  
  // Normalize source and action to lowercase
  if (this.source) this.source = this.source.toLowerCase();
  if (this.action) this.action = this.action.toLowerCase();
  
  // Ensure metadata is always an object
  if (typeof this.metadata !== 'object' || this.metadata === null) {
    this.metadata = {};
  }

  // Convert localhost IPs to consistent format
  if (this.ip === '::1') {
    this.ip = '127.0.0.1';
  }
  
  next();
});

// Add text index for search
auditLogSchema.index({
  event: 'text',
  userAgent: 'text',
  'metadata.message': 'text'
});

module.exports = mongoose.model('AuditLog', auditLogSchema);