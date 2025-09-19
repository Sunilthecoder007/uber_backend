// Simple test script to verify API endpoints
// Run with: node test-api.js

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
let authToken = '';

// Test data
const testUser = {
  name: 'Test User',
  email: 'test@example.com',
  phone: '9876543210',
  password: 'password123'
};

const testRide = {
  pickupLocation: {
    address: 'Bandra West, Mumbai',
    coordinates: {
      latitude: 19.0760,
      longitude: 72.8777
    }
  },
  dropLocation: {
    address: 'Andheri East, Mumbai',
    coordinates: {
      latitude: 19.0896,
      longitude: 72.8656
    }
  },
  rideType: 'economy'
};

// Helper function to make API calls
const apiCall = async (method, endpoint, data = null, useAuth = false) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...(useAuth && authToken ? { Authorization: `Bearer ${authToken}` } : {})
      },
      ...(data ? { data } : {})
    };

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message 
    };
  }
};

// Test functions
const testHealthCheck = async () => {
  console.log('\n🔍 Testing Health Check...');
  const result = await apiCall('GET', '/health');
  console.log(result.success ? '✅ Health check passed' : '❌ Health check failed:', result.error);
  return result.success;
};

const testUserRegistration = async () => {
  console.log('\n🔍 Testing User Registration...');
  const result = await apiCall('POST', '/auth/register', testUser);
  if (result.success) {
    authToken = result.data.data.token;
    console.log('✅ User registration successful');
    console.log(`📝 Auth token: ${authToken.substring(0, 20)}...`);
  } else {
    console.log('❌ User registration failed:', result.error);
  }
  return result.success;
};

const testUserLogin = async () => {
  console.log('\n🔍 Testing User Login...');
  const result = await apiCall('POST', '/auth/login', {
    email: testUser.email,
    password: testUser.password
  });
  if (result.success) {
    authToken = result.data.data.token;
    console.log('✅ User login successful');
  } else {
    console.log('❌ User login failed:', result.error);
  }
  return result.success;
};

const testGetProfile = async () => {
  console.log('\n🔍 Testing Get Profile...');
  const result = await apiCall('GET', '/auth/profile', null, true);
  console.log(result.success ? '✅ Get profile successful' : '❌ Get profile failed:', result.error);
  return result.success;
};

const testFareEstimate = async () => {
  console.log('\n🔍 Testing Fare Estimate...');
  const params = new URLSearchParams({
    fromLat: testRide.pickupLocation.coordinates.latitude,
    fromLng: testRide.pickupLocation.coordinates.longitude,
    toLat: testRide.dropLocation.coordinates.latitude,
    toLng: testRide.dropLocation.coordinates.longitude,
    fromAddress: testRide.pickupLocation.address,
    toAddress: testRide.dropLocation.address,
    rideType: testRide.rideType
  });
  
  const result = await apiCall('GET', `/rides/estimate?${params}`, null, true);
  if (result.success) {
    console.log('✅ Fare estimate successful');
    console.log(`💰 Estimated fare: ₹${result.data.data.totalFare} for ${result.data.data.distance}km`);
  } else {
    console.log('❌ Fare estimate failed:', result.error);
  }
  return result.success;
};

const testRideBooking = async () => {
  console.log('\n🔍 Testing Ride Booking...');
  const result = await apiCall('POST', '/rides/book', testRide, true);
  if (result.success) {
    console.log('✅ Ride booking successful');
    console.log(`🚗 Ride ID: ${result.data.data.ride._id}`);
    return result.data.data.ride._id;
  } else {
    console.log('❌ Ride booking failed:', result.error);
    return null;
  }
};

const testRideHistory = async () => {
  console.log('\n🔍 Testing Ride History...');
  const result = await apiCall('GET', '/rides/history', null, true);
  if (result.success) {
    console.log('✅ Ride history retrieved successfully');
    console.log(`📊 Total rides: ${result.data.data.rides.length}`);
  } else {
    console.log('❌ Ride history failed:', result.error);
  }
  return result.success;
};

// Main test runner
const runTests = async () => {
  console.log('🚀 Starting API Tests...');
  console.log('='.repeat(50));

  const tests = [
    testHealthCheck,
    testUserRegistration,
    testGetProfile,
    testFareEstimate,
    testRideBooking,
    testRideHistory
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`❌ Test failed with error: ${error.message}`);
      failed++;
    }
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Your API is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the server logs and fix any issues.');
  }
};

// Check if server is running before starting tests
const checkServer = async () => {
  try {
    await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server is running, starting tests...');
    await runTests();
  } catch (error) {
    console.log('❌ Server is not running. Please start the server first with: npm run dev');
    console.log('   Then run this test script again.');
  }
};

// Run the tests
checkServer();
