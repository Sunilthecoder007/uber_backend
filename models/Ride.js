const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true
  },
  coordinates: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    }
  }
}, { _id: false });

const rideHistorySchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['created', 'accepted', 'started', 'destination_updated', 'completed', 'cancelled'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  details: {
    type: String
  }
}, { _id: false });

const rideSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'started', 'completed', 'cancelled'],
    default: 'pending'
  },
  pickupLocation: {
    type: locationSchema,
    required: true
  },
  dropLocation: {
    type: locationSchema,
    required: true
  },
  originalDropLocation: {
    type: locationSchema // Store original destination for reference
  },
  distance: {
    type: Number, // in kilometers
    required: true
  },
  estimatedDuration: {
    type: Number, // in minutes
    default: null
  },
  fare: {
    baseFare: {
      type: Number,
      required: true
    },
    totalFare: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'INR'
    }
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'wallet', 'upi'],
    default: 'cash'
  },
  rideStartTime: {
    type: Date,
    default: null
  },
  rideEndTime: {
    type: Date,
    default: null
  },
  cancellationReason: {
    type: String,
    default: null
  },
  cancelledBy: {
    type: String,
    enum: ['user', 'driver', 'system'],
    default: null
  },
  rating: {
    userRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    driverRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    }
  },
  history: [rideHistorySchema],
  notes: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Indexes for better query performance
rideSchema.index({ userId: 1, createdAt: -1 });
rideSchema.index({ driverId: 1, status: 1 });
rideSchema.index({ status: 1, createdAt: -1 });
rideSchema.index({ "pickupLocation.coordinates": "2dsphere" });

// Add history entry before saving
rideSchema.pre('save', function(next) {
  if (this.isNew) {
    this.history.push({
      action: 'created',
      details: 'Ride request created'
    });
  } else if (this.isModified('status')) {
    this.history.push({
      action: this.status,
      details: `Ride status changed to ${this.status}`
    });
  }
  next();
});

// Calculate estimated duration based on distance (rough estimate: 30 km/h average speed)
rideSchema.pre('save', function(next) {
  if (this.isModified('distance') && this.distance) {
    this.estimatedDuration = Math.ceil((this.distance / 30) * 60); // Convert to minutes
  }
  next();
});

// Virtual for ride duration
rideSchema.virtual('actualDuration').get(function() {
  if (this.rideStartTime && this.rideEndTime) {
    return Math.ceil((this.rideEndTime - this.rideStartTime) / (1000 * 60)); // in minutes
  }
  return null;
});

// Ensure virtuals are included in JSON output
rideSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Ride', rideSchema);
