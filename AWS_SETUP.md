# HEALTH NET — Guía de configuración AWS (us-west-1)

Esta guía detalla el aprovisionamiento y configuración paso a paso de los servicios de AWS en la región de **US West (N. California) - us-west-1** para habilitar el flujo de telemetría y el hosting del Dashboard.

## Arquitectura del Sistema

```
ESP32 / Simulador  →  MQTT (SSL/TLS)  →  AWS IoT Core
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
                  IoT Rules                                       Dashboard
                      │                                          (React + WS)
                      ▼
               AWS Lambda (VPC)
                      │
                      ▼
            Aurora PostgreSQL (VPC)
```

---

## 1. Amazon Virtual Private Cloud (VPC)

Para proteger la base de datos Aurora PostgreSQL y permitir la comunicación interna de la función Lambda, configuraremos una VPC dedicada.

1. Ve a **AWS Console → VPC → Create VPC**.
2. Selecciona **VPC and more**.
3. Configura:
   - **Name tag**: `healthnet-vpc`
   - **IPv4 CIDR block**: `10.0.0.0/16`
   - **Number of Availability Zones (AZs)**: `2` (para cumplir requisitos de Aurora)
   - **Number of Public Subnets**: `2`
   - **Number of Private Subnets**: `2`
   - **NAT Gateways**: `1 per AZ` o `1 public` (necesario si Lambda necesita descargar paquetes externos; si no, selecciona `None`).
   - **VPC Endpoints**: `None`.
4. Presiona **Create VPC**.

### Crear Grupo de Seguridad (Security Group) para Aurora
1. Ve a **VPC → Security Groups → Create security group**.
2. Configura:
   - **Security group name**: `healthnet-db-sg`
   - **Description**: Permitir acceso a PostgreSQL desde la VPC
   - **VPC**: Selecciona `healthnet-vpc`
3. En **Inbound rules** (Reglas de entrada):
   - **Type**: `PostgreSQL (5432)`
   - **Source**: `10.0.0.0/16` (toda la VPC) o el Security Group que usará la Lambda.
4. Presiona **Create security group**.

---

## 2. AWS Cognito — User Pool

1. Ve a **AWS Console → Cognito → Create user pool**.
2. Configura:
   - **Sign-in experience**: Email.
   - **Password policy**: Mínimo 8 caracteres, 1 mayúscula, 1 número.
   - **MFA**: Desactivado (o activado si se requiere).
3. **Configure App client**:
   - **App client name**: `healthnet-dashboard`
   - **Auth flows**: `USER_PASSWORD_AUTH`, `REFRESH_TOKEN_AUTH`
   - **Client secret**: **Sin client secret** (requerido para aplicaciones SPA ejecutadas en el navegador).
4. Copia el **User Pool ID** y el **App Client ID** → pégalos en tu archivo `.env`.

### Crear usuario administrador inicial vía CLI
```bash
aws cognito-idp admin-create-user \
  --region us-west-1 \
  --user-pool-id TU_USER_POOL_ID \
  --username admin@healthnet.com \
  --temporary-password Admin1234! \
  --user-attributes Name=email,Value=admin@healthnet.com Name=email_verified,Value=true
```

### Establecer contraseña permanente (Bypassear FORCE_CHANGE_PASSWORD)
Dado que el comando anterior crea al usuario en estado `FORCE_CHANGE_PASSWORD`, debes convertir la contraseña en permanente para poder iniciar sesión directamente en el Dashboard web:
```bash
aws cognito-idp admin-set-user-password \
  --user-pool-id TU_USER_POOL_ID \
  --username admin@healthnet.com \
  --password 'Admin1234!' \
  --permanent
```

---

## 3. AWS Cognito — Identity Pool

1. Ve a **Cognito → Identity pools → Create**.
2. Configura:
   - **Identity pool name**: `healthnet_identity_pool`
   - **Authentication providers**: Vincula el User Pool y App Client del paso anterior.
3. En **IAM Role para usuarios autenticados**, edita o crea un rol con la siguiente política de permisos para permitir la conexión MQTT segura:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "iot:Connect",
        "iot:Subscribe",
        "iot:Receive",
        "iot:Publish"
      ],
      "Resource": [
        "arn:aws:iot:us-west-1:ACCOUNT_ID:client/healthnet-*",
        "arn:aws:iot:us-west-1:ACCOUNT_ID:topic/healthnet/*",
        "arn:aws:iot:us-west-1:ACCOUNT_ID:topicfilter/healthnet/*"
      ]
    }
  ]
}
```
*(Reemplaza `ACCOUNT_ID` por tu ID de cuenta AWS).*

4. Copia el **Identity Pool ID** → pégalo en tu archivo `.env`.

### Vincular la Política de IoT Core al ID de Identidad (Requerido para WebSockets)
Para que el navegador pueda conectarse exitosamente a AWS IoT Core a través de WebSockets, es obligatorio asociar la política de IoT (`healthnet-device-policy`) a tu ID de identidad temporal de Cognito:

1. **Obtener tu ID de identidad (IdentityId)** de Cognito:
   ```bash
   aws cognito-identity list-identities --identity-pool-id TU_IDENTITY_POOL_ID --max-results 10
   ```
2. **Asociar la política** al ID de identidad:
   ```bash
   aws iot attach-policy --policy-name healthnet-device-policy --target "TU_COGNITO_IDENTITY_ID"
   ```

---

## 4. Amazon Aurora PostgreSQL

Aprovisionamiento de la base de datos relacional para persistir el historial de telemetría.

1. Ve a **AWS Console → RDS → Databases → Create database**.
2. Configura:
   - **Choose a database creation method**: Standard create.
   - **Engine options**: **Amazon Aurora**.
   - **Edition**: Amazon Aurora PostgreSQL-Compatible Edition.
   - **Templates**: Dev/Test (o producción según corresponda).
   - **DB cluster identifier**: `healthnet-aurora-cluster`
   - **Credentials Specification**:
     - **Master username**: `postgres`
     - **Master password**: Elige una contraseña segura (e.g., `HealthNetSecurePass123!`).
   - **Instance configuration**:
     - **Instance class**: `db.r8g.large` (según estimación).
   - **Connectivity**:
     - **VPC**: `healthnet-vpc`
     - **Subnet group**: Crea un nuevo grupo de subnets que contenga las subnets privadas de tu VPC.
     - **Public access**: No (solo accesible internamente).
     - **VPC security group**: Elige el existente `healthnet-db-sg`.
   - **Storage amount**: `256 GB` (almacenamiento asignado).
3. Presiona **Create database**.

### Creación de la Tabla de Telemetría y la Tabla de Pacientes
Una vez que el clúster esté disponible, conéctate usando un cliente PostgreSQL dentro de la VPC (o una instancia bastión) y ejecuta:

```sql
CREATE TABLE telemetry (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL,
    patient_name VARCHAR(100),
    heart_rate INT NOT NULL,
    temperature NUMERIC(4, 2) NOT NULL,
    fall_detected BOOLEAN DEFAULT FALSE,
    battery INT,
    timestamp BIGINT NOT NULL
);

CREATE INDEX idx_telemetry_device_timestamp ON telemetry (device_id, timestamp DESC);

-- Tabla para almacenar el perfil del paciente y la configuración de alertas
CREATE TABLE patients (
    device_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    age VARCHAR(20),
    gender VARCHAR(50),
    weight VARCHAR(50),
    height VARCHAR(50),
    phone VARCHAR(50),
    emergency_contact VARCHAR(100),
    
    -- Configuración de alertas
    hr_min INT DEFAULT 50,
    hr_max INT DEFAULT 110,
    temp_max NUMERIC(4, 2) DEFAULT 38.00,
    notifications_active BOOLEAN DEFAULT TRUE,
    watch_theme VARCHAR(20) DEFAULT 'dark',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_patients_device_id ON patients (device_id);

-- Función para actualizar automáticamente el campo 'updated_at' al modificar registros
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para ejecutar la función de actualización de timestamp
CREATE OR REPLACE TRIGGER update_patients_updated_at
    BEFORE UPDATE ON patients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 5. AWS Lambda

Esta función se encargará de recibir los eventos de AWS IoT Core e insertarlos en Aurora PostgreSQL.

1. Ve a **AWS Console → Lambda → Functions → Create function**.
2. Configura:
   - **Author from scratch**.
   - **Function name**: `healthnet-telemetry-ingest`
   - **Runtime**: Node.js 18.x o superior.
   - **Architecture**: `x86_64` (según estimación).
3. **Advanced settings**:
   - Marca **Enable VPC**.
   - **VPC**: Selecciona `healthnet-vpc`.
   - **Subnets**: Elige las dos subnets privadas donde reside Aurora PostgreSQL.
   - **Security groups**: Selecciona un security group que tenga acceso de salida (outbound) a PostgreSQL (e.g., el mismo `healthnet-db-sg` o uno creado para la Lambda).
4. Presiona **Create function**.

### Código de la Lambda (index.js)
Sube o escribe el siguiente código para gestionar la inserción en la base de datos (asegúrate de empaquetar con la dependencia `pg` de npm si lo subes como ZIP/carpeta):

```javascript
const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

let isConnected = false;

async function connectDb() {
  if (!isConnected) {
    await client.connect();
    isConnected = true;
  }
}

exports.handler = async (event) => {
  console.log("Evento recibido de IoT Core:", JSON.stringify(event, null, 2));
  
  try {
    await connectDb();
    
    const query = `
      INSERT INTO telemetry (device_id, patient_name, heart_rate, temperature, fall_detected, battery, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    const values = [
      event.deviceId,
      event.patientName || null,
      event.heartRate,
      event.temperature,
      event.fallDetected || false,
      event.battery || null,
      event.timestamp || Date.now()
    ];
    
    await client.query(query, values);
    return { statusCode: 200, body: 'Telemetry saved' };
  } catch (err) {
    console.error("Error guardando telemetría:", err);
    throw err;
  }
};
```
*(Configura las variables de entorno `DB_HOST`, `DB_USER`, `DB_PASSWORD` y `DB_NAME` en la pestaña Configuration → Environment variables de la Lambda).*

### 5.2. Función Lambda para API de Pacientes (healthnet-patients-api)

Esta función se encarga de realizar operaciones CRUD (Crear, Leer, Eliminar) en la tabla `patients` de Aurora PostgreSQL para persistir el perfil clínico del paciente y la configuración de umbrales del brazalete.

1. Ve a **AWS Console → Lambda → Functions → Create function**.
2. Configura:
   - **Author from scratch**.
   - **Function name**: `healthnet-patients-api`
   - **Runtime**: Node.js 18.x o superior.
   - **Architecture**: `x86_64`.
3. **Advanced settings**:
   - Marca **Enable VPC**.
   - **VPC**: Selecciona `healthnet-vpc`.
   - **Subnets**: Selecciona las dos subnets privadas donde reside Aurora PostgreSQL.
   - **Security groups**: Selecciona el mismo security group que tiene acceso a PostgreSQL (`healthnet-db-sg`).
4. Presiona **Create function**.
5. **Configurar Variables de Entorno**:
   - Ve a la pestaña **Configuration → Environment variables** y añade:
     - `DB_HOST`: Host/endpoint de tu Aurora PostgreSQL.
     - `DB_USER`: `postgres`
     - `DB_PASSWORD`: La contraseña configurada para tu base de datos.
     - `DB_NAME`: `postgres` (o el nombre de tu base de datos).
     - `DB_PORT`: `5432`
6. **Subir el Código**:
   - En tu máquina local, abre una terminal en el directorio `aws/lambdas/patients-api/`.
   - Instala la dependencia de PostgreSQL:
     ```bash
     npm install
     ```
   - Comprime los archivos `index.js`, `package.json` y la carpeta `node_modules` en un archivo ZIP (ej. `patients-api.zip`).
   - Sube el archivo ZIP a la función Lambda mediante la interfaz web: **Code → Upload from → .zip file**.

---

## 5.5. Amazon API Gateway (Exponer API de Pacientes)

Para permitir que el navegador web (React SPA) consulte y actualice la información de los pacientes en Aurora PostgreSQL, configuraremos un punto de enlace HTTP seguro mediante API Gateway.

1. Ve a **AWS Console → API Gateway → APIs → Create API**.
2. En la sección **REST API** (no la privada), presiona **Build**.
3. Configura:
   - **API details**: Selecciona **New API**.
   - **API name**: `healthnet-api`
   - **Endpoint Type**: Regional.
4. Presiona **Create API**.

### Crear Recursos y Métodos:

1. **Recurso /patients**:
   - Selecciona la raíz (`/`) y presiona **Create resource**.
   - **Resource name**: `patients`
   - Presiona **Create resource**.
   - Selecciona `/patients` y presiona **Create method**:
     - **Method type**: `ANY` (o crea individualmente `GET` y `POST`).
     - **Integration type**: `Lambda function`.
     - Activa **Lambda proxy integration** (¡Esencial para que la Lambda procese las rutas y cabeceras!).
     - **Lambda function**: Selecciona tu Lambda `healthnet-patients-api`.
     - Presiona **Create method**.

2. **Recurso /{deviceId} (Ruta de Paciente Individual)**:
   - Selecciona `/patients` y presiona **Create resource**.
   - **Resource name**: `{deviceId}`
   - **Resource path**: `{deviceId}` (se creará como `/patients/{deviceId}`).
   - Presiona **Create resource**.
   - Selecciona `{deviceId}` y presiona **Create method**:
     - **Method type**: `ANY` (o crea individualmente `GET` y `DELETE`).
     - **Integration type**: `Lambda function`.
     - Activa **Lambda proxy integration**.
     - **Lambda function**: Selecciona tu Lambda `healthnet-patients-api`.
     - Presiona **Create method**.

### Habilitar CORS (Cross-Origin Resource Sharing):

Dado que el frontend llama a esta API desde orígenes distintos (como `localhost` o un bucket de S3), debes habilitar CORS en API Gateway:

1. Selecciona el recurso `/patients` y presiona **Enable CORS**.
2. Marca los métodos `GET, POST, OPTIONS`.
3. Deja los valores predeterminados de Access-Control-Allow-Headers y Access-Control-Allow-Origin (`'*'`).
4. Presiona **Save**.
5. Selecciona el recurso `{deviceId}` y presiona **Enable CORS**.
6. Marca los métodos `GET, DELETE, OPTIONS`.
7. Presiona **Save**.

### Desplegar la API:

1. Haz clic en **Deploy API** (botón arriba a la derecha).
2. En **Stage**, selecciona ***New stage***.
3. **Stage name**: `prod`.
4. Presiona **Deploy**.
5. Copia la **Invoke URL** generada (se verá como `https://xxxxxxxxxx.execute-api.us-west-1.amazonaws.com/prod`).
6. Pega este valor en tu archivo `.env` en la propiedad `VITE_API_ENDPOINT`.

---

## 6. AWS IoT Core

1. Ve a **AWS Console → IoT Core → Settings**. Copia el **Device data endpoint** (ej. `xxxxxxxxxxxxxx-ats.iot.us-west-1.amazonaws.com`) y pégalo en tu archivo `.env` en la propiedad `VITE_IOT_ENDPOINT`.
2. Ve a **Security → Policies → Create policy**:
   - **Name**: `healthnet-device-policy`
   - **Policy document**:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": ["iot:Connect", "iot:Publish", "iot:Subscribe", "iot:Receive"],
           "Resource": "*"
         }
       ]
     }
     ```

### IoT Rule para Invocar la Lambda
1. Ve a **IoT Core → Message routing → Rules → Create rule**.
2. Configura:
   - **Rule name**: `healthnet_to_lambda`
   - **SQL statement**:
     ```sql
     SELECT * FROM 'healthnet/devices/+/telemetry'
     ```
3. **Rule actions**:
   - Selecciona **Lambda**.
   - Escoge la función Lambda: `healthnet-telemetry-ingest`.
4. Guarda la regla. AWS IoT Core asignará automáticamente los permisos necesarios a la regla para poder invocar a tu Lambda.

---

## 7. Amazon S3 & Route 53 (Frontend Hosting y DNS)

1. Ve a **AWS Console → S3 → Create bucket**:
   - **Bucket name**: `healthnet-dashboard-frontend`
   - **Region**: `us-west-1`.
   - Desmarca **Block all public access** (si usarás hosting estático directo de S3, o manténlo bloqueado si usarás CloudFront con OAI/OAC).
2. Sube los archivos compilados del frontend (carpeta `dist/` generada por `npm run build`).
3. Ve a **Route 53 → Hosted Zones → Create hosted zone**:
   - **Domain name**: `tu-dominio-healthnet.com`.
   - Crea un registro A Alias que apunte a la distribución CloudFront de tu bucket S3 para servir el Dashboard de forma segura bajo HTTPS.

---

## 8. AWS Web Application Firewall (WAF)

Para proteger el frontend contra ataques web comunes y limitar el tráfico no deseado.

1. Ve a **AWS Console → WAF & Shield → Create Web ACL**.
2. Configura:
   - **Region**: `us-west-1` (o Global si se asocia a CloudFront).
   - **Associated AWS resources**: Vincula el recurso de distribución de CloudFront o el Application Load Balancer del backend.
3. Configura reglas predeterminadas (como el grupo de reglas administradas de AWS Core rule set, reputación de IP, etc.) para bloquear peticiones maliciosas e inyecciones SQL.

---

## 9. Correr el Proyecto Frontend Localmente

```bash
# 1. Instalar dependencias
cd healthnet-dashboard
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Edita el archivo .env con las credenciales creadas en us-west-1

# 3. Iniciar el servidor local
npm run dev

# 4. Acceder al dashboard en el navegador
# http://localhost:5173
```
