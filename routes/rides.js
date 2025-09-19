const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Ride = require('../models/Ride');
const User = require('../models/User');
const { authenticateToken, requireUser } = require('../middleware/auth');
const { estimateFare, calculateDistance, validateCoordinates } = require('../utils/fareCalculator');

const router = express.Router();

// Apply authentication to all ride routes
router.use(authenticateToken);

// Validation middleware
const validateRideBooking = [
  body('pickupLocation.address')
    .notEmpty()
    .withMessage('Pickup address is required'),
  body('pickupLocation.coordinates.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid pickup latitude is required'),
  body('pickupLocation.coordinates.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid pickup longitude is required'),
  body('dropLocation.address')
    .notEmpty()
    .withMessage('Drop address is required'),
  body('dropLocation.coordinates.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid drop latitude is required'),
  body('dropLocation.coordinates.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid drop longitude is required'),
  body('rideType')
    .optional()
    .isIn(['economy', 'premium', 'luxury'])
    .withMessage('Invalid ride type')
];

const validateDestinationUpdate = [
  body('dropLocation.address')
    .notEmpty()
    .withMessage('New drop address is required'),
  body('dropLocation.coordinates.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid drop latitude is required'),
  body('dropLocation.coordinates.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid drop longitude is required')
];

const validateFareEstimate = [
  query('fromLat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid from latitude is required'),
  query('fromLng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid from longitude is required'),
  query('toLat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid to latitude is required'),
  query('toLng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid to longitude is required'),
  query('fromAddress')
    .notEmpty()
    .withMessage('From address is required'),
  query('toAddress')
    .notEmpty()
    .withMessage('To address is required')
];

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// GET /rides/estimate - Estimate fare before booking
router.get('/estimate', validateFareEstimate, handleValidationErrors, async (req, res) => {
  try {
    const { fromLat, fromLng, toLat, toLng, fromAddress, toAddress, rideType = 'economy' } = req.query;

    const pickup = {
      address: fromAddress,
      coordinates: {
        latitude: parseFloat(fromLat),
        longitude: parseFloat(fromLng)
      }
    };

    const drop = {
      address: toAddress,
      coordinates: {
        latitude: parseFloat(toLat),
        longitude: parseFloat(toLng)
      }
    };

    // Calculate fare estimate
    const fareEstimate = estimateFare(pickup, drop, rideType);

    res.status(200).json({
      success: true,
      message: 'Fare estimated successfully',
      data: fareEstimate
    });
  } catch (error) {
    console.error('Fare estimation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to estimate fare',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /rides/book - Book nearest available ride
router.post('/book', requireUser, validateRideBooking, handleValidationErrors, async (req, res) => {
  try {
    const { pickupLocation, dropLocation, rideType = 'economy', notes } = req.body;
    const userId = req.user._id;

    // Check if user has any active rides
    const activeRide = await Ride.findOne({
      userId,
      status: { $in: ['pending', 'accepted', 'started'] }
    });

    if (activeRide) {
      return res.status(409).json({
        success: false,
        message: 'You already have an active ride. Please complete or cancel it first.',
        data: { activeRideId: activeRide._id }
      });
    }

    // Calculate distance and fare
    const distance = calculateDistance(
      pickupLocation.coordinates.latitude,
      pickupLocation.coordinates.longitude,
      dropLocation.coordinates.latitude,
      dropLocation.coordinates.longitude
    );

    const fareEstimate = estimateFare(pickupLocation, dropLocation, rideType);

    // Create new ride
    const ride = new Ride({
      userId,
      pickupLocation,
      dropLocation,
      originalDropLocation: dropLocation, // Store original destination
      distance,
      fare: {
        baseFare: fareEstimate.baseFare,
        totalFare: fareEstimate.totalFare
      },
      notes
    });

    await ride.save();

    // Populate user details
    await ride.populate('userId', 'name phone email rating');

    // In a real app, you would notify nearby drivers here
    // For now, we'll just return the ride details

    res.status(201).json({
      success: true,
      message: 'Ride booked successfully. Looking for nearby drivers...',
      data: {
        ride,
        fareBreakdown: fareEstimate
      }
    });
  } catch (error) {
    console.error('Ride booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to book ride',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /rides/:id/status - Get current ride status
router.get('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const ride = await Ride.findOne({ _id: id, userId })
      .populate('userId', 'name phone email rating')
      .populate('driverId', 'name phone email rating');

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Ride status retrieved successfully',
      data: { ride }
    });
  } catch (error) {
    console.error('Get ride status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get ride status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /rides/:id/update-destination - Change/add destination during ride
router.put('/:id/update-destination', requireUser, validateDestinationUpdate, handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { dropLocation } = req.body;
    const userId = req.user._id;

    const ride = await Ride.findOne({ 
      _id: id, 
      userId,
      status: { $in: ['accepted', 'started'] }
    });

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Active ride not found or cannot be modified'
      });
    }

    // Calculate new distance and fare
    const newDistance = calculateDistance(
      ride.pickupLocation.coordinates.latitude,
      ride.pickupLocation.coordinates.longitude,
      dropLocation.coordinates.latitude,
      dropLocation.coordinates.longitude
    );

    const newFareEstimate = estimateFare(ride.pickupLocation, dropLocation);

    // Update ride with new destination
    ride.dropLocation = dropLocation;
    ride.distance = newDistance;
    ride.fare.baseFare = newFareEstimate.baseFare;
    ride.fare.totalFare = newFareEstimate.totalFare;

    // Add to history
    ride.history.push({
      action: 'destination_updated',
      details: `Destination updated to ${dropLocation.address}`
    });

    await ride.save();

    res.status(200).json({
      success: true,
      message: 'Destination updated successfully',
      data: {
        ride,
        fareBreakdown: newFareEstimate
      }
    });
  } catch (error) {
    console.error('Update destination error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update destination',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /rides/:id/cancel - Cancel an active or pending ride
router.post('/:id/cancel', requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    const ride = await Ride.findOne({ 
      _id: id, 
      userId,
      status: { $in: ['pending', 'accepted'] }
    });

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found or cannot be cancelled'
      });
    }

    // Update ride status
    ride.status = 'cancelled';
    ride.cancellationReason = reason || 'Cancelled by user';
    ride.cancelledBy = 'user';

    // Add to history
    ride.history.push({
      action: 'cancelled',
      details: ride.cancellationReason
    });

    await ride.save();

    // In a real app, you would notify the driver here

    res.status(200).json({
      success: true,
      message: 'Ride cancelled successfully',
      data: { ride }
    });
  } catch (error) {
    console.error('Cancel ride error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel ride',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /rides/history - Get all past rides of the user
router.get('/history', requireUser, async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10, status } = req.query;

    // Build query
    const query = { userId };
    if (status) {
      query.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get rides with pagination
    const rides = await Ride.find(query)
      .populate('driverId', 'name phone rating')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalRides = await Ride.countDocuments(query);
    const totalPages = Math.ceil(totalRides / parseInt(limit));

    res.status(200).json({
      success: true,
      message: 'Ride history retrieved successfully',
      data: {
        rides,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRides,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get ride history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get ride history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /rides/active - Get current active ride
router.get('/active', requireUser, async (req, res) => {
  try {
    const userId = req.user._id;

    const activeRide = await Ride.findOne({
      userId,
      status: { $in: ['pending', 'accepted', 'started'] }
    })
    .populate('driverId', 'name phone email rating')
    .sort({ createdAt: -1 });

    if (!activeRide) {
      return res.status(404).json({
        success: false,
        message: 'No active ride found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Active ride retrieved successfully',
      data: { ride: activeRide }
    });
  } catch (error) {
    console.error('Get active ride error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get active ride',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
