const admin = require('firebase-admin');
const { getAuth } = require('firebase-admin/auth');
const path = require('path');

let authEnabled = false;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const serviceAccount = require(path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    // Specify projectId so token verification works on EC2 without credentials
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'pixlink-93a32'
    });
  }
  authEnabled = true;
  console.log('[Auth] Firebase Admin initialized.');
} catch (err) {
  console.warn('[Auth] WARNING: Firebase Admin failed to initialize. Auth will run in mock mode.', err.message);
}

/**
 * Optional Auth middleware.
 * If a token is provided, it attempts to verify and attach req.userId.
 * If not provided or invalid, it simply proceeds as an anonymous request.
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split('Bearer ')[1];

  if (!authEnabled) {
    req.userId = token === 'test-token' ? 'mock-user-123' : token.substring(0, 20);
    return next();
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    req.userId = decodedToken.uid;
    req.userEmail = decodedToken.email;
    next();
  } catch (error) {
    // Just proceed anonymously if token fails
    next();
  }
}

/**
 * Strict Auth middleware.
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split('Bearer ')[1];

  if (!authEnabled) {
    req.userId = token === 'test-token' ? 'mock-user-123' : token.substring(0, 20);
    return next();
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    req.userId = decodedToken.uid;
    req.userEmail = decodedToken.email;
    next();
  } catch (error) {
    console.error('[Auth] Token verification failed:', error.message);
    res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
  }
}

module.exports = { optionalAuth, requireAuth };
