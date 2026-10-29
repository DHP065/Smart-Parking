const admin = require('firebase-admin');
const User = require('../models/User');

const firebaseAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid Authorization header' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  // Mock mode for local testing without Firebase credentials
  if (idToken.startsWith('mock-token') || process.env.FIREBASE_PROJECT_ID === 'your-firebase-project-id') {
    try {
      const isEdge = idToken.includes('mock-edge');
      const roleStr = isEdge ? 'edge' : 'admin';
      const uidStr = isEdge ? 'mock-edge-uid-5678' : 'mock-admin-uid-1234';
      const emailStr = isEdge ? 'edge@smartpark.local' : 'admin@smartpark.local';
      const nameStr = isEdge ? 'Test Edge Operator' : 'Test Admin';

      // console.warn(`[Mock Auth] Bypassing Firebase Auth. Using mock ${roleStr} session.`);
      let dummyUser = await User.findOneAndUpdate(
        { uid: uidStr },
        {
          $setOnInsert: {
            email: emailStr,
            displayName: nameStr,
          },
          $set: {
            uid: uidStr,
            role: roleStr,
          }
        },
        { new: true, upsert: true }
      );

      req.user = dummyUser;
      return next();
    } catch (error) {
      console.error('[Mock Auth] Error creating dummy user:', error.message);
      return res.status(500).json({ message: 'Internal server error during mock auth bypass' });
    }
  }

  try {
    // If Firebase admin wasn't initialized (e.g., missing credentials), this throws "default Firebase app does not exist"
    if (admin.apps.length === 0) {
      throw new Error('Firebase Admin SDK is not initialized. Please check your FIREBASE_PRIVATE_KEY and other env vars in backend/.env');
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const user = await User.findOne({ uid: decodedToken.uid });
    
    if (!user) {
      return res.status(401).json({ message: 'User not registered in database' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Firebase Auth Error:', error.message);
    res.status(401).json({ message: 'Unauthorized: ' + error.message });
  }
};

module.exports = firebaseAuth;
