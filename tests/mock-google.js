import express from 'express';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { createHash, randomBytes } from 'node:crypto';
import * as oidc from 'openid-client';
export async function mockGoogle(port = 0) {
  const keys = await generateKeyPair('RS256');
  const wrong = await generateKeyPair('RS256');
  const jwk = { ...await exportJWK(keys.publicKey), kid: 'mock-key', alg: 'RS256', use: 'sig' };
  const app = express();
  app.use(express.urlencoded({ extended: false }));
  const codes = new Map();
  let behavior = {};
  const server = await new Promise(resolve => { const s = app.listen(port, '127.0.0.1', () => resolve(s)); });
  const issuer = `http://127.0.0.1:${server.address().port}`;
  app.get('/authorize', (req, res) => {
    const code = randomBytes(16).toString('hex');
    codes.set(code, { ...req.query, ...behavior });
    const target = new URL(req.query.redirect_uri);
    target.searchParams.set('code', code); target.searchParams.set('state', req.query.state);
    res.redirect(target.href);
  });
  app.get('/jwks', (req, res) => res.json({ keys: [jwk] }));
  app.post('/token', async (req, res) => {
    const c = codes.get(req.body.code); codes.delete(req.body.code);
    if (!c || req.body.redirect_uri !== c.redirect_uri || createHash('sha256').update(req.body.code_verifier || '').digest('base64url') !== c.code_challenge) return res.status(400).json({ error: 'invalid_grant' });
    if (c.beforeToken) await c.beforeToken();
    const token = await new SignJWT({ sub: c.sub || 'mock-subject', email: c.email || 'google-adult@example.test', email_verified: c.verified !== false, nonce: c.badNonce ? 'wrong' : c.nonce }).setProtectedHeader({ alg: 'RS256', kid: 'mock-key' }).setIssuer(c.badIssuer ? 'https://wrong.example' : issuer).setAudience(c.badAudience ? 'wrong-client' : 'mock-client').setIssuedAt().setExpirationTime(c.expired ? Math.floor(Date.now() / 1000) - 120 : '5m').sign(c.badSignature ? wrong.privateKey : keys.privateKey);
    res.json({ access_token: 'mock-only-access', token_type: 'Bearer', expires_in: 300, id_token: token });
  });
  const configuration = new oidc.Configuration({ issuer, authorization_endpoint: `${issuer}/authorize`, token_endpoint: `${issuer}/token`, jwks_uri: `${issuer}/jwks`, id_token_signing_alg_values_supported: ['RS256'] }, 'mock-client', 'mock-secret');
  oidc.allowInsecureRequests(configuration);
  oidc.enableNonRepudiationChecks(configuration);
  return { configuration, setBehavior: value => { behavior = value; }, close: () => new Promise(resolve => server.close(resolve)) };
}
