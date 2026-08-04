const { Client } = require('pg');

const clientConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: { rejectUnauthorized: false }
};

let client = null;

async function getDbClient() {
  if (!client) {
    client = new Client(clientConfig);
    await client.connect();
  }
  return client;
}

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS'
};

exports.handler = async (event) => {
  console.log('HTTP Event received:', JSON.stringify(event, null, 2));

  // Handle CORS preflight options request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const db = await getDbClient();
    
    // Determine the route
    const httpMethod = event.httpMethod;
    const pathParameters = event.pathParameters || {};
    const deviceId = pathParameters.deviceId;

    // GET /patients (list all patients)
    if (httpMethod === 'GET' && !deviceId) {
      const result = await db.query('SELECT * FROM patients ORDER BY name ASC');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows)
      };
    }

    // GET /patients/{deviceId} (get specific patient)
    if (httpMethod === 'GET' && deviceId) {
      const result = await db.query('SELECT * FROM patients WHERE device_id = $1', [deviceId]);
      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: `Patient with deviceId ${deviceId} not found` })
        };
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows[0])
      };
    }

    // POST/PUT /patients (upsert patient)
    if (httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const targetDeviceId = deviceId || body.deviceId;

      if (!targetDeviceId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Missing deviceId parameter' })
        };
      }

      const query = `
        INSERT INTO patients (
          device_id, name, age, gender, weight, height, phone, emergency_contact,
          hr_min, hr_max, temp_max, notifications_active, watch_theme
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (device_id) DO UPDATE SET
          name = EXCLUDED.name,
          age = EXCLUDED.age,
          gender = EXCLUDED.gender,
          weight = EXCLUDED.weight,
          height = EXCLUDED.height,
          phone = EXCLUDED.phone,
          emergency_contact = EXCLUDED.emergency_contact,
          hr_min = EXCLUDED.hr_min,
          hr_max = EXCLUDED.hr_max,
          temp_max = EXCLUDED.temp_max,
          notifications_active = EXCLUDED.notifications_active,
          watch_theme = EXCLUDED.watch_theme,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *;
      `;

      const values = [
        targetDeviceId,
        body.name || 'Paciente Nuevo',
        body.age || '',
        body.gender || '',
        body.weight || '',
        body.height || '',
        body.phone || '',
        body.emergencyContact || body.emergency_contact || '',
        body.hrMin || body.hr_min || 50,
        body.hrMax || body.hr_max || 110,
        body.tempMax || body.temp_max || 38.00,
        body.notificationsActive !== undefined ? body.notificationsActive : (body.notifications_active !== undefined ? body.notifications_active : true),
        body.watchTheme || body.watch_theme || 'dark'
      ];

      const result = await db.query(query, values);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows[0])
      };
    }

    // DELETE /patients/{deviceId} (delete specific patient)
    if (httpMethod === 'DELETE' && deviceId) {
      const result = await db.query('DELETE FROM patients WHERE device_id = $1 RETURNING *', [deviceId]);
      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: `Patient with deviceId ${deviceId} not found` })
        };
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: `Patient with deviceId ${deviceId} deleted successfully`, patient: result.rows[0] })
      };
    }

    // Unhandled methods/paths
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method Not Allowed' })
    };

  } catch (error) {
    console.error('Database query error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Internal Server Error', error: error.message })
    };
  }
};
