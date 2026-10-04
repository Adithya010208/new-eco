import crypto from 'node:crypto';

const sa = {
  project_id: "eco-build-aa966",
  private_key_id: "8fa3bc69c2f6755f7f95681315b75cc6c5c03da7",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDS+ou+JAfnKgJ8\na11WT3HhvIC43Fe9A/CaIN0tQWmqOTGVOoVGmAjVRVxnRTS32VAO484TX7g+QZth\nnRgOGeLnp2rNnYjuZVPpzU2+TAlp0cIVecraeXM7C6q3E6x3SaHn6qmY57Kv/0RA\nYA3DOpfp+IQoeCibuy59mW19kaUR7FEbbqrzCqIqMu5EM+MwYsefthcreK4E+ACc\nCUpvX6dbnUtzQJ0bRfSoedYpi/Ihx1zygEX55sOnQaRkV7iv6VhDhtSzUeYIX9Po\ni/6upvpPPNn1nIhQjt3WJhekCB3/GZVgj5+2hHyMgL0mVWcAuQzucBMUKZnPhG8/\n8veJ8u2DAgMBAAECggEAK+5k09Jv3Ng4DU1T8al4Rq94REYJdP/RhV6Lf6VrybjA\nFNlLMDBvQm1/eLeF6zRyga841Xrsg/YoUzKhdCo6v87yI9+GSFHMH9aStiniGelG\nFy+1qDl635Ql15peorYv4vlPmFnCsPgf76Gwq/LS+DK53i1rE0ZuP1QH4wpFS44+\n/DPWW+M0KMWtM6XnRW0PdzOsn4vbrTxoyt05n64FddwKESajLt0cGI9IbsSRQsp/\nIon8tORxzPr7Fkuqz6RLjmUBJr8wUjpmCd0PwMDV0YVXwJ2ExsYNCw/jjK6t2yVv\nmqMFIAVifAGSFB+G2oHh9iI95qW7sxF2onHFQ9+HTQKBgQD/WzHBXGyHoezzkhso\nDlIk2roegKWLFJ3LHdDcIuEO8Lhc8JSKUe19l4LG1BLGkcJUuiZHUO03lYFtmGcV\nC+pCvcXpiQrufdr84FbpHfyzSyqGRgJb78By/9ShdOHYh1pqbbGp0/WirqVdstU2\neOT43TQjvmWrKq6fv+RMmtB61wKBgQDTgrXhl7a+Q8Rj0TUDJOkCNlqgCM9Ekpwv\naO2eXxxIv6iX7qqHYq3nzpi84qp1vWc19HC1MPCkZtQp1Cbe4IC5+4O3GmaADgI7\nawLc+LP76lcOYVLXwilRw1z1hYXXINkIQt+do9rFKu3ImnF5KCt9BDOwgwxKP+zm\nSQTfErmZNQKBgECz/NF/98gOUZoOJW9q4YmRGqPr+QZavPjgnzGIbPp6KFz0YM8D\nn2e5Ylu7FN7XxCPv3w8nBFSXP2pjuYrtr/glWeao4Oo5XanBtoPvIz7TBv1q8+IT\nx/HbvScEFM3mzhQ1o1Ti7lTAaApr6/aXf31Hn5SHA//xGrpDxzdZ6wWVAoGBAMFt\ngiQC+M5bbxjR1CdB9A1f49UC+Xn+kfMRhG0XEei9zdLUIwOZDO03FJt4tubiBadk\nGka5sPjISTLPn5Snv1FWYIhtDlwBc60fGgk3MHIrRt4Rxw8ls1/gx/yI1XN9yL0z\nWwjxNjqmHbsc8rUYNV0pIJRF5FFq0J1xHZFbsHwZAoGBANIzuY0L3A8QrWSZ1xFp\n71naHDiVYxcXboiXOabneyQyiU8CY3D/T1/3FuvoZnGVCyy/C360BiYMUhhXfLSX\nn2/u1RSc8W/eOOkDArODrOCIYBoC7htmnk23JJqpNcJrAWMOx4Zp9rjrnKhFJusg\n5hYPuQXZDULvnzz2eS1OYW38\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@eco-build-aa966.iam.gserviceaccount.com"
};

function base64url(str) {
  return Buffer.from(str).toString('base64url');
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedClaimSet = base64url(JSON.stringify(claimSet));
  const signatureInput = `${encodedHeader}.${encodedClaimSet}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signatureInput);
  const signature = signer.sign(sa.private_key, 'base64url');

  const jwt = `${signatureInput}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

async function run() {
  console.log('Obtaining access token...');
  const token = await getAccessToken();
  console.log('Token acquired successfully.');

  // 1. Fetch web apps
  console.log('Fetching web apps for project eco-build-aa966...');
  const appsRes = await fetch('https://firebase.googleapis.com/v1beta1/projects/eco-build-aa966/webApps', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const appsData = await appsRes.json();
  console.log('Web Apps:', JSON.stringify(appsData, null, 2));

  // If web apps exist, fetch config for each
  if (appsData.apps && appsData.apps.length > 0) {
    for (const app of appsData.apps) {
      console.log(`Fetching config for app ${app.appId}...`);
      const cfgRes = await fetch(`https://firebase.googleapis.com/v1beta1/projects/eco-build-aa966/webApps/${app.appId}/config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const cfgData = await cfgRes.json();
      console.log(`Config for ${app.appId}:`, JSON.stringify(cfgData, null, 2));
    }
  }

  // 2. Fetch Firestore databases
  console.log('Fetching Firestore databases for project eco-build-aa966...');
  const dbRes = await fetch('https://firestore.googleapis.com/v1/projects/eco-build-aa966/databases', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const dbData = await dbRes.json();
  console.log('Databases:', JSON.stringify(dbData, null, 2));
}

run().catch(console.error);
