import crypto from 'crypto';

export const verifyGithubSignature = (req, res, next) => {
    const signature = req.headers['x-hub-signature-256'];
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    
    // 1. Ensure the signature exists
    if (!signature) {
        return res.status(401).send('No signature found on request');
    }

    // 2. Ensure we successfully captured the raw bytes
    if (!req.rawBody) {
        return res.status(500).send('Raw body is missing for signature verification');
    }

    // 3. Re-calculate the hash using our local secret and the raw request body
    const hmac = crypto.createHmac('sha256', webhookSecret);
    const digest = Buffer.from('sha256=' + hmac.update(req.rawBody).digest('hex'), 'utf8');
    const checksum = Buffer.from(signature, 'utf8');

    // 4. Securely compare the calculated hash against GitHub's hash
    if (checksum.length !== digest.length || !crypto.timingSafeEqual(digest, checksum)) {
        console.error('Webhook signature verification failed!');
        return res.status(401).send('Signatures did not match!');
    }

    console.log('Webhook signature verified successfully.');
    next(); // Security passed, hand off to the route controller
};