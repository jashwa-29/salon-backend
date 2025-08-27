const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Customer = require('../models/Customer');

// Register new user
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    // Validate required fields
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create new user
    const user = new User({ name, email, password, role, phone });
    await user.save();

    // Handle customer record - ONLY for users with 'customer' role
    let customer = null;
    if (role === 'customer') {
      // Check for existing customer by phone or email
      const existingCustomer = await Customer.findOne({
        $or: [{ email }, { phone }]
      });

      if (existingCustomer) {
        // Update existing customer
        existingCustomer.isRegisteredUser = true;
        existingCustomer.userId = user._id;
        existingCustomer.email = email; // Update email if different
        existingCustomer.name = name; // Update name if different
        customer = await existingCustomer.save();
      } else {
        // Create new customer
        customer = new Customer({
          name,
          email,
          phone,
          isRegisteredUser: true,
          userId: user._id
        });
        await customer.save();
      }

      // Update user with customer reference
      user.customer = customer._id;
      await user.save();
    }

    // Generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    // Prepare response
    const responseData = {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone ,
         date: new Date()
        

      }
    };

    // Add customerId to response if user is a customer
    if (role === 'customer' && customer) {
      responseData.user.customerId = customer.customerId;
    }

    res.status(201).json(responseData);

  } catch (err) {
    console.error(err);
    
    // Handle duplicate key errors
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({ 
        message: `${field} already exists`,
        field
      });
    }

    res.status(500).json({ message: 'Server error' });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    res.json({ token, user: { id: user._id, name: user.name, email, role: user.role , 
         date: new Date() } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get current user
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};