const Customer = require('../models/Customer');
const User = require('../models/User');

// Create customer (for both online and offline)
exports.createCustomer = async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    // Validate required fields
    if (!name || !phone) {
      return res.status(400).json({ message: 'Name and phone are required' });
    }

    // Check for existing customer by phone
    const existingCustomer = await Customer.findOne({ phone });
    if (existingCustomer) {
      return res.status(400).json({ 
        message: 'Customer with this phone already exists',
        customer: existingCustomer
      });
    }

    // If email is provided, check for duplicates
    if (email) {
      const emailExists = await Customer.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ 
          message: 'Customer with this email already exists',
          customer: emailExists
        });
      }
    }

    // Create new customer
    const customer = new Customer({
      name,
      email: email || null, // Explicitly set to null if undefined
      phone,
      isRegisteredUser: false
    });

    await customer.save();

    res.status(201).json({
      message: 'Customer created successfully',
      customer: {
        customerId: customer.customerId,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        isRegisteredUser: customer.isRegisteredUser,
        createdAt: customer.createdAt
      }
    });

  } catch (err) {
    console.error(err);
    
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

// Get all customers
exports.getAllCustomers = async (req, res) => {
  try {
    const { search } = req.query;
    
    let query = {};
    
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { customerId: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const customers = await Customer.find(query)
      .sort({ createdAt: -1 })
      .select('-__v');

    res.json(customers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update customer
exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Prevent changing customerId
    if (updateData.customerId) {
      delete updateData.customerId;
    }

    const customer = await Customer.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json({
      message: 'Customer updated successfully',
      customer
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get single customer
exports.getCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findById(id);

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json(customer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};