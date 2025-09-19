// Utility functions for fare calculation and distance estimation

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

/**
 * Convert degrees to radians
 * @param {number} degrees 
 * @returns {number} Radians
 */
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Calculate fare based on distance
 * @param {number} distance - Distance in kilometers
 * @param {string} rideType - Type of ride (economy, premium, etc.)
 * @returns {object} Fare breakdown
 */
const calculateFare = (distance, rideType = 'economy') => {
  const farePerKm = parseFloat(process.env.FARE_PER_KM) || 15;
  const baseFare = 50; // Base fare in INR
  const minimumFare = 80; // Minimum fare in INR
  
  // Different multipliers for different ride types
  const rideTypeMultipliers = {
    economy: 1.0,
    premium: 1.5,
    luxury: 2.0
  };
  
  const multiplier = rideTypeMultipliers[rideType] || 1.0;
  
  // Calculate base fare
  let calculatedFare = baseFare + (distance * farePerKm * multiplier);
  
  // Apply minimum fare
  if (calculatedFare < minimumFare) {
    calculatedFare = minimumFare;
  }
  
  // Add taxes and fees (18% GST)
  const gst = calculatedFare * 0.18;
  const totalFare = calculatedFare + gst;
  
  return {
    baseFare: Math.round(calculatedFare * 100) / 100,
    gst: Math.round(gst * 100) / 100,
    totalFare: Math.round(totalFare * 100) / 100,
    distance: distance,
    farePerKm: farePerKm,
    rideType: rideType
  };
};

/**
 * Estimate fare for a ride
 * @param {object} pickup - Pickup location with coordinates
 * @param {object} drop - Drop location with coordinates
 * @param {string} rideType - Type of ride
 * @returns {object} Fare estimate
 */
const estimateFare = (pickup, drop, rideType = 'economy') => {
  const distance = calculateDistance(
    pickup.coordinates.latitude,
    pickup.coordinates.longitude,
    drop.coordinates.latitude,
    drop.coordinates.longitude
  );
  
  const fareBreakdown = calculateFare(distance, rideType);
  
  // Estimate time (assuming average speed of 30 km/h in city traffic)
  const estimatedTime = Math.ceil((distance / 30) * 60); // in minutes
  
  return {
    ...fareBreakdown,
    estimatedTime,
    pickup: pickup.address,
    drop: drop.address
  };
};

/**
 * Mock Google Maps API response for distance calculation
 * In production, replace this with actual Google Maps API call
 * @param {string} origin - Origin address
 * @param {string} destination - Destination address
 * @returns {Promise<object>} Distance and duration
 */
const getDistanceFromGoogleMaps = async (origin, destination) => {
  // Mock implementation - replace with actual Google Maps API
  // For now, return random values for demonstration
  const mockDistance = Math.random() * 20 + 2; // 2-22 km
  const mockDuration = Math.ceil((mockDistance / 25) * 60); // Assuming 25 km/h average
  
  return {
    distance: Math.round(mockDistance * 100) / 100,
    duration: mockDuration,
    status: 'OK'
  };
};

/**
 * Validate coordinates
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {boolean} True if valid coordinates
 */
const validateCoordinates = (latitude, longitude) => {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    latitude >= -90 && latitude <= 90 &&
    longitude >= -180 && longitude <= 180
  );
};

module.exports = {
  calculateDistance,
  calculateFare,
  estimateFare,
  getDistanceFromGoogleMaps,
  validateCoordinates
};
