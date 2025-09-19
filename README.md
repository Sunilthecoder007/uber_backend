# 🚗 Uber Backend - Ride Booking API

A comprehensive backend system for a ride-booking application (like Uber) built with Node.js, Express.js, and MongoDB. This API handles user authentication, ride booking, fare estimation, and ride management.

## 🚀 Features

- **User Authentication**: JWT-based authentication with registration, login, and profile management
- **Ride Booking**: Book rides, estimate fares, and track ride status
- **Dynamic Pricing**: Fare calculation based on distance with support for different ride types
- **Ride Management**: Cancel rides, update destinations, and view ride history
- **Security**: Rate limiting, input validation, and secure password hashing
- **Real-time Status**: Track ride status from booking to completion

## 🛠️ Tech Stack

- **Backend**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: bcryptjs for password hashing, Helmet for security headers
- **Validation**: express-validator for input validation
- **Rate Limiting**: express-rate-limit

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd uber-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/uber_backend
   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
   JWT_EXPIRES_IN=7d
   FARE_PER_KM=15
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

5. **Run the application**
   ```bash
   # Development mode with nodemon
   npm run dev
   
   # Production mode
   npm start
   ```

The server will start on `http://localhost:3000`

## 📚 API Documentation

### Base URL
```
http://localhost:3000
```

### Authentication Endpoints

#### 1. Register User
```http
POST /auth/register
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "password": "password123",
  "address": {
    "street": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "zipCode": "400001",
    "coordinates": {
      "latitude": 19.0760,
      "longitude": 72.8777
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": { ... },
    "token": "jwt_token_here"
  }
}
```

#### 2. Login User
```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

#### 3. Get Profile
```http
GET /auth/profile
Authorization: Bearer <jwt_token>
```

#### 4. Update Profile
```http
PUT /auth/profile
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "name": "John Updated",
  "phone": "9876543211",
  "address": {
    "street": "456 New St",
    "city": "Delhi"
  }
}
```

#### 5. Logout
```http
POST /auth/logout
Authorization: Bearer <jwt_token>
```

### Ride Endpoints

#### 1. Estimate Fare
```http
GET /rides/estimate?fromLat=19.0760&fromLng=72.8777&toLat=19.0896&toLng=72.8656&fromAddress=Bandra&toAddress=Andheri&rideType=economy
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Fare estimated successfully",
  "data": {
    "baseFare": 85.50,
    "gst": 15.39,
    "totalFare": 100.89,
    "distance": 2.37,
    "farePerKm": 15,
    "rideType": "economy",
    "estimatedTime": 5,
    "pickup": "Bandra",
    "drop": "Andheri"
  }
}
```

#### 2. Book Ride
```http
POST /rides/book
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "pickupLocation": {
    "address": "Bandra West, Mumbai",
    "coordinates": {
      "latitude": 19.0760,
      "longitude": 72.8777
    }
  },
  "dropLocation": {
    "address": "Andheri East, Mumbai",
    "coordinates": {
      "latitude": 19.0896,
      "longitude": 72.8656
    }
  },
  "rideType": "economy",
  "notes": "Please call when you arrive"
}
```

#### 3. Get Ride Status
```http
GET /rides/:rideId/status
Authorization: Bearer <jwt_token>
```

#### 4. Update Destination
```http
PUT /rides/:rideId/update-destination
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "dropLocation": {
    "address": "New destination address",
    "coordinates": {
      "latitude": 19.1000,
      "longitude": 72.9000
    }
  }
}
```

#### 5. Cancel Ride
```http
POST /rides/:rideId/cancel
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "reason": "Change of plans"
}
```

#### 6. Get Ride History
```http
GET /rides/history?page=1&limit=10&status=completed
Authorization: Bearer <jwt_token>
```

#### 7. Get Active Ride
```http
GET /rides/active
Authorization: Bearer <jwt_token>
```

## 🗄️ Database Models

### User Model
```javascript
{
  name: String,
  email: String (unique),
  phone: String (unique),
  password: String (hashed),
  profilePicture: String,
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  isDriver: Boolean,
  isActive: Boolean,
  totalRides: Number,
  rating: Number
}
```

### Ride Model
```javascript
{
  userId: ObjectId (ref: User),
  driverId: ObjectId (ref: User),
  status: String (pending, accepted, started, completed, cancelled),
  pickupLocation: {
    address: String,
    coordinates: { latitude: Number, longitude: Number }
  },
  dropLocation: {
    address: String,
    coordinates: { latitude: Number, longitude: Number }
  },
  originalDropLocation: Object,
  distance: Number,
  estimatedDuration: Number,
  fare: {
    baseFare: Number,
    totalFare: Number,
    currency: String
  },
  paymentStatus: String,
  paymentMethod: String,
  rideStartTime: Date,
  rideEndTime: Date,
  cancellationReason: String,
  cancelledBy: String,
  rating: {
    userRating: Number,
    driverRating: Number
  },
  history: Array,
  notes: String
}
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcryptjs with salt rounds
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: Comprehensive validation using express-validator
- **Security Headers**: Helmet.js for security headers
- **CORS**: Cross-origin resource sharing configuration

## 🧪 Testing the API

### Using curl:

1. **Register a user:**
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "9876543210",
    "password": "password123"
  }'
```

2. **Login:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

3. **Book a ride:**
```bash
curl -X POST http://localhost:3000/rides/book \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "pickupLocation": {
      "address": "Bandra West, Mumbai",
      "coordinates": {"latitude": 19.0760, "longitude": 72.8777}
    },
    "dropLocation": {
      "address": "Andheri East, Mumbai", 
      "coordinates": {"latitude": 19.0896, "longitude": 72.8656}
    }
  }'
```

## 🚀 Deployment

### Environment Variables for Production:
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://your-production-db-url
JWT_SECRET=your-super-secure-production-secret
FARE_PER_KM=15
```

### Docker Deployment:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 📝 API Response Format

All API responses follow this consistent format:

**Success Response:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description",
  "errors": [ ... ] // For validation errors
}
```

## 🔧 Configuration

### Fare Configuration:
- Base fare: ₹50
- Per km rate: ₹15 (configurable via environment)
- Minimum fare: ₹80
- GST: 18%

### Ride Types:
- **Economy**: 1.0x multiplier
- **Premium**: 1.5x multiplier  
- **Luxury**: 2.0x multiplier

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, email support@example.com or create an issue in the repository.

---

**Note**: This is a backend-only implementation. Frontend, driver APIs, and admin panel are not included in this project.
