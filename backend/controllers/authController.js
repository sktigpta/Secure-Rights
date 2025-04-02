const { admin } = require("../config/firebase");

// REGISTER (Creates a user in Firebase Authentication)
exports.register = async (req, res) => {
  const { email, password, name, role = 'user' } = req.body;

  console.log(req.body);

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
      customClaims: { role },
    });

    // Respond with user details (UID, email, and name)
    res.status(201).json({ uid: userRecord.uid, email: userRecord.email, name, role });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


// LOGIN (Handled on Frontend, Firebase does not support login on backend)
exports.login = async (req, res) => {
  res.status(200).json({ message: "Login via Firebase Client SDK" });
};

// GET USER DETAILS (Protected, Requires Firebase ID Token)
exports.getMe = async (req, res) => {
  try {
    const userRecord = await admin.auth().getUser(req.user.uid);

    res.json({
      uid: userRecord.uid,
      email: userRecord.email,
      name: userRecord.displayName,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
