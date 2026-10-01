// src/shared/token.ts
import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { config } from './config';
import { UnauthorizedError } from './errors';

// Input shape for signing — iat and exp are absent here because jwt.sign
// adds them automatically based on the expiresIn option.
interface SignInput {
  sub:  string;
  role: 'admin' | 'recruiter' | 'applicant';
}

// Shape of the decoded payload after a successful jwt.verify call.
// Includes iat and exp because jwt.sign embeds them at issuance time.
export interface TokenPayload {
  sub:  string;
  role: 'admin' | 'recruiter' | 'applicant';
  iat:  number;
  exp:  number;
}

//When a user logs in successfully, you call this function to create their wristband(token)
export function signAccessToken(payload: SignInput): string {
  // config.JWT_EXPIRES_IN is typed as string. @types/jsonwebtoken types
  // expiresIn as StringValue (a branded type from the ms package), which is
  // narrower than string. The cast to any silences the type mismatch without
  // changing runtime behaviour — '15m' is a valid ms string regardless.
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN as any,
  });
}




//What verifyAccessToken does
//Every time a user makes a request (like "show me all jobs"), they send their token. 
//Your server calls this function to check if the token is genuine:
export function verifyAccessToken(token: string): TokenPayload {
  try {
    // jwt.verify returns JwtPayload | string. The cast to TokenPayload is a
    // type assertion, not a runtime check. We trust it here because this server
    // is the only issuer of tokens signed with JWT_SECRET, and signAccessToken
    // above controls the payload shape. If the signature verification passes,
    // the payload is what we put there.
    return jwt.verify(token, config.JWT_SECRET) as TokenPayload;
  } catch (err) {
    // TokenExpiredError must be caught before JsonWebTokenError because
    // TokenExpiredError extends JsonWebTokenError — catching JsonWebTokenError
    // first would match TokenExpiredError before reaching this branch.
    if (err instanceof TokenExpiredError) {
      throw new UnauthorizedError('Token expired');
    }
    if (err instanceof JsonWebTokenError) {
      throw new UnauthorizedError('Invalid token');
    }
    throw err;
  }
}



/*
User logs in → signAccessToken() → sends token to user
User makes request → sends token → verifyAccessToken() → get their id and role → handle request
*/