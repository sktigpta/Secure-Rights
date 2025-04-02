const { admin } = require("../config/firebase");

exports.register = async (req, res) => {
  const { email, password, name } = req.body;

  try {
    // Create user in Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
      customClaims: { role: 'user' } // Default role
    });

    // Return user data without sensitive info
    res.status(201).json({
      uid: userRecord.uid,
      email: userRecord.email,
      name: userRecord.displayName,
      role: 'user'
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ 
      error: error.message.includes("email") 
        ? "Email already exists" 
        : "Registration failed" 
    });
  }
};

exports.login = async (req, res) => {
  res.status(200).json({ 
    message: "Authentication should be handled client-side using Firebase SDK" 
  });
};

exports.getMe = async (req, res) => {
  try {
    const user = await admin.auth().getUser(req.user.uid);
    
    res.json({
      uid: user.uid,
      email: user.email,
      name: user.displayName,
      role: req.user.role || 'user'
    });
    
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: "Server error" });
  }
};


exports.setUserRole = async (req, res) => {
  const { uid, role } = req.body;

  try {
    // Validate role
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: "Invalid role specified" });
    }

    // Update custom claims
    await admin.auth().setCustomUserClaims(uid, { role });
    
    // Get updated user data
    const user = await admin.auth().getUser(uid);

    res.json({
      uid: user.uid,
      email: user.email,
      role: role,
      message: "Role updated successfully"
    });
    
  } catch (error) {
    console.error('Role update error:', error);
    res.status(400).json({ 
      error: error.message.includes("no user") 
        ? "User not found" 
        : "Role update failed" 
    });
  }
};