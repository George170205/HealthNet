# HEALTH NET — Documentación General del Proyecto y Manual Técnico

Este archivo contiene la documentación completa, instrucciones de instalación, guía de comandos, arquitectura, vinculación funcional de variables de entorno, justificaciones de diseño y troubleshooting sobre el proyecto **HealthNet Dashboard**.

---

## Índice
1. [Descripción del Proyecto](#1-descripción-del-proyecto)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Diseño de Flujo de la Aplicación](#3-diseño-de-flujo-de-la-aplicación)
4. [Estructura del Proyecto y Carpetas](#4-estructura-del-proyecto-y-carpetas)
5. [Instalación y Ejecución Local](#5-instalación-y-ejecución-local)
6. [Obtención de IDs para el .env mediante AWS CLI](#6-obtención-de-ids-para-el-env-mediante-aws-cli)
7. [Aprovisionamiento Completo de la Infraestructura en AWS](#7-aprovisionamiento-completo-de-la-infraestructura-en-aws)
8. [Justificación de Diseño y Vinculación Funcional](#8-justificación-de-diseño-y-vinculación-funcional)
9. [Registro de Problemas y Troubleshooting (AWS/VM)](#9-registro-de-problemas-y-troubleshooting-awsvm)
10. [Comandos del Proyecto (npm)](#10-comandos-del-proyecto-npm)
11. [Reglas de Alerta y Telemetría](#11-reglas-de-alerta-y-telemetría)

---

## 1. Descripción del Proyecto

**HealthNet Dashboard** es una aplicación web (Single Page Application) desarrollada en **React, TypeScript y Vite** orientada al monitoreo clínico en tiempo real de pacientes que utilizan dispositivos portátiles de salud (como relojes inteligentes basados en ESP32 o simuladores de telemetría).

El sistema centraliza e interpreta los signos vitales, evalúa umbrales dinámicos adaptados a la condición médica de cada paciente, registra incidentes de caídas y genera reportes médicos listos para impresión en formato PDF en alta definición sin cortes de página.

---

## 2. Arquitectura del Sistema

La solución integra dispositivos inteligentes en el borde (Edge) con la nube de AWS en la región de `us-west-1` (Norte de California):

```
ESP32 / Simulador  ──(MQTT / WebSockets)──>  AWS IoT Core
                                                   │
                                   ┌───────────────┼───────────────┐
                                   ▼               ▼               ▼
                               IoT Rules         Aurora        Dashboard
                               (Lambda)        PostgreSQL     (React + WS)
                                   │               ▲
                                   └───────────────┘
                                    (Guarda en BD)
```

### Componentes Clave:
* **Frontend (React + TS + Vite)**: Hospedado estáticamente en **Amazon S3**, distribuido mediante **Amazon CloudFront**, con resolución DNS vía **Amazon Route 53** y mitigación de ataques con **AWS WAF**.
* **AWS Cognito**: User Pools para administración y Login de personal médico; Identity Pools para otorgar credenciales temporales de AWS con permisos MQTT.
* **AWS IoT Core**: Broker MQTT para comunicación bidireccional en tiempo real a través de WebSockets (WSS).
* **Amazon VPC**: Red de seguridad que aísla la base de datos relacional y la ejecución de la función de ingesta.
* **AWS Lambda**: Función de ingesta serverless Node.js integrada a la VPC para persistir registros en base de datos.
* **Amazon Aurora PostgreSQL-Compatible DB**: Base de datos relacional persistente para almacenar el histórico de telemetrías.

---

## 3. Diseño de Flujo de la Aplicación

### A. Autenticación y Autorización
1. El médico inicia sesión en `LoginPage` usando AWS Cognito User Pool.
2. Tras la validación, Cognito Identity Pool intercambia el token JWT por credenciales temporales de AWS (Access Key ID, Secret Access Key y Session Token) vinculadas a un rol IAM de solo lectura MQTT de IoT Core.

### B. Conexión en Tiempo Real (WebSockets)
1. El hook `useAuth` suministra las credenciales de AWS al servicio `iot.ts`.
2. Se realiza una firma criptográfica **Signature Version 4 (SigV4)** para validar el origen y se abre la conexión WebSocket seguro (`wss://`) con AWS IoT Core.
3. El frontend se suscribe al tema `healthnet/devices/+/telemetry` para capturar la telemetría en vivo.

### C. Ingesta e Historial
1. Los dispositivos publican mediciones en formato JSON a `healthnet/devices/{deviceId}/telemetry`.
2. El broker distribuye los datos en tiempo real al Dashboard.
3. Simultáneamente, una **IoT Rule** redirige el payload a una función **AWS Lambda** que los inserta en la tabla `telemetry` de **Aurora PostgreSQL** dentro de la VPC.

### D. Alertas y Confirmaciones
1. El store global de Zustand (`deviceStore.ts`) evalúa cada lectura contra los umbrales personalizados del paciente.
2. Si se sobrepasan los límites (ej. Ritmo cardíaco > máx configurado), se genera una alerta inmediata.
3. El médico visualiza las alertas en tiempo real y puede marcarlas como confirmadas (`acknowledged`).

---

## 4. Estructura del Proyecto y Carpetas

* **`src/components/`**: Componentes visuales reutilizables, incluyendo `SmartwatchSimulator.tsx` (caja del reloj físico y pantalla) y `Sidebar.tsx`.
* **`src/components/charts/`**: Gráficas compactas y extendidas de Recharts (`HeartRateChart.tsx`, `TempChart.tsx`) con animaciones desactivables para el PDF.
* **`src/pages/`**: Vistas principales de la aplicación unificada (DashboardPage, ProfilePage para gestión de pacientes y configuración, SimulatorPage).
* **`src/services/`**: Lógica de infraestructura externa (`auth.ts` para Cognito, `iot.ts` para WebSockets/MQTT y `simulator.ts`).
* **`src/store/`**: Estado reactivo global (`deviceStore.ts`) con persistencia en localStorage para las preferencias de umbrales clínicos y temas.
* **`src/types/`**: Tipado de datos de telemetría y configuraciones del reloj (`index.ts`).

---

## 5. Instalación y Ejecución Local

### Prerrequisitos
* **Node.js** v18 o superior e **npm**.

### Pasos de Configuración
1. Instalar dependencias del proyecto:
   ```bash
   npm install
   ```
2. Crear un archivo `.env` en la raíz copiando el archivo de ejemplo:
   ```bash
   cp .env.example .env
   ```
3. Editar el archivo `.env` con las credenciales correspondientes a tu infraestructura en AWS.
4. Arrancar en servidor local:
   ```bash
   npm run dev
   ```

---

## 6. Obtención de IDs para el .env mediante AWS CLI

A continuación se detallan los comandos de terminal de AWS CLI utilizados para obtener y rellenar las variables de entorno del archivo `.env`:

### A. VITE_COGNITO_USER_POOL_ID
Identifica el grupo de usuarios de Cognito para el Login del personal médico.
* **Comando para obtenerlo**:
  ```bash
  aws cognito-idp list-user-pools --max-results 10
  ```
* **Salida JSON típica**:
  ```json
  {
      "UserPools": [
          {
              "Id": "us-west-1_pGyxBNhWT",
              "Name": "healthnet-user-pool"
          }
      ]
  }
  ```

### B. VITE_COGNITO_APP_CLIENT_ID
Identifica la aplicación cliente sin clave secreta para la SPA en React.
* **Comando para obtenerlo**:
  ```bash
  aws cognito-idp list-user-pool-clients --user-pool-id us-west-1_pGyxBNhWT
  ```
* **Salida JSON típica**:
  ```json
  {
      "UserPoolClients": [
          {
              "ClientId": "44mekj043fj0rj1csugnfuln1e",
              "UserPoolId": "us-west-1_pGyxBNhWT",
              "ClientName": "healthnet-dashboard"
          }
      ]
  }
  ```

### C. VITE_COGNITO_IDENTITY_POOL_ID
Pool de identidades para el intercambio de credenciales temporales de IAM.
* **Comando para obtenerlo**:
  ```bash
  aws cognito-identity list-identity-pools --max-results 10
  ```
* **Salida JSON típica**:
  ```json
  {
      "IdentityPools": [
          {
              "IdentityPoolId": "us-west-1:9cb26dab-294e-4d39-ada4-0dace6e9492a",
              "IdentityPoolName": "healthnet_identity_pool"
          }
      ]
  }
  ```

### D. VITE_IOT_ENDPOINT
La dirección DNS única de tu broker de mensajería MQTT de AWS IoT Core.
* **Comando para obtenerlo**:
  ```bash
  aws iot describe-endpoint --endpoint-type iot:Data-ATS
  ```
* **Salida JSON típica**:
  ```json
  {
      "endpointAddress": "a1dqyzlqe79i10-ats.iot.us-west-1.amazonaws.com"
  }
  ```

### E. Host de Base de Datos RDS (DB_HOST)
La dirección de conexión interna DNS del clúster de base de datos relacional.
* **Comando para obtenerlo**:
  ```bash
  aws rds describe-db-instances \
    --query "DBInstances[*].Endpoint.Address" \
    --output text
  ```
* **Resultado típico**:
  `healthnet-db-instance.chiooewk8fd8.us-west-1.rds.amazonaws.com`

---

## 7. Aprovisionamiento Completo de la Infraestructura en AWS

Secuencia ordenada de comandos CLI para crear toda la infraestructura serverless y de red en la región `us-west-1`:

### Paso 1: Redes y Subredes (VPC)
1. **Crear VPC**:
   ```bash
   aws ec2 create-vpc --cidr-block '10.0.0.0/16' --no-amazon-provided-ipv6-cidr-block --instance-tenancy 'default' --tag-specifications '{"ResourceType":"vpc","Tags":[{"Key":"Name","Value":"healthnet-vpc"}]}'
   ```
2. **Habilitar Hostnames DNS**:
   ```bash
   aws ec2 modify-vpc-attribute --vpc-id 'vpc-065feffb70147d508' --enable-dns-hostnames '{"Value":true}'
   ```
3. **Crear e Instalar Internet Gateway**:
   ```bash
   aws ec2 create-internet-gateway --tag-specifications '{"ResourceType":"internet-gateway","Tags":[{"Key":"Name","Value":"healthnet-vpc-igw"}]}'
   aws ec2 attach-internet-gateway --internet-gateway-id 'igw-0de245731fd48e5cf' --vpc-id 'vpc-065feffb70147d508'
   ```
4. **Crear Subredes Privadas (Multi-AZ para Aurora)**:
   ```bash
   aws ec2 create-subnet --vpc-id vpc-065feffb70147d508 --cidr-block 10.0.128.0/20 --availability-zone us-west-1a --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=healthnet-vpc-subnet-private1-us-west-1a}]'
   aws ec2 create-subnet --vpc-id vpc-065feffb70147d508 --cidr-block 10.0.144.0/20 --availability-zone us-west-1c --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=healthnet-vpc-subnet-private2-us-west-1c}]'
   ```

### Paso 2: Base de Datos Relacional (Amazon Aurora PostgreSQL)
1. **Crear Subnet Group**:
   ```bash
   aws rds create-db-subnet-group --db-subnet-group-name healthnet-db-subnet-group --db-subnet-group-description "Subnet group for healthnet db" --subnet-ids subnet-026b12c27c6039124 subnet-069ad6dfa5bd0612f
   ```
2. **Crear Clúster DB**:
   ```bash
   aws rds create-db-cluster --db-cluster-identifier healthnet-aurora-cluster --engine aurora-postgresql --engine-version 15.4 --master-username postgres --master-user-password 'HealthNetSecurePass123!' --db-subnet-group-name healthnet-db-subnet-group --vpc-security-group-ids sg-01a1b01fbdf2be112
   ```

### Paso 3: Ingesta Serverless (AWS Lambda)
1. **Crear Rol de Ejecución**:
   ```bash
   aws iam create-role --role-name healthnet-lambda-execution-role --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
   ```
2. **Crear Función Lambda dentro de la VPC**:
   ```bash
   aws lambda create-function --function-name healthnet-telemetry-ingest --runtime nodejs18.x --role arn:aws:iam::743337585043:role/healthnet-lambda-execution-role --handler index.handler --zip-file fileb://function.zip --vpc-config SubnetIds=subnet-026b12c27c6039124,subnet-069ad6dfa5bd0612f,SecurityGroupIds=sg-01a1b01fbdf2be112 --environment 'Variables={DB_HOST=healthnet-db-instance.chiooewk8fd8.us-west-1.rds.amazonaws.com,DB_USER=postgres,DB_PASSWORD=HealthNetSecurePass123!,DB_NAME=postgres}'
   ```

### Paso 4: Configurar Acceso Seguro a IoT (Cognito)
1. **Crear User Pool**:
   ```bash
   aws cognito-idp create-user-pool --pool-name healthnet-user-pool --username-attributes email --policies 'PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=false}'
   ```
2. **Crear App Client sin Secreto**:
   ```bash
   aws cognito-idp create-user-pool-client --user-pool-id 'us-west-1_pGyxBNhWT' --client-name healthnet-dashboard --no-generate-secret --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH
   ```
3. **Crear Identity Pool**:
   ```bash
   aws cognito-identity create-identity-pool --identity-pool-name healthnet_identity_pool --allow-unauthenticated-identities --cognito-identity-providers ProviderName=cognito-idp.us-west-1.amazonaws.com/us-west-1_pGyxBNhWT,ClientId=44mekj043fj0rj1csugnfuln1e
   ```
4. **Crear Rol IAM de Cognito Autenticado**:
   ```bash
   aws iam create-role --role-name healthnet-cognito-auth-role --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Federated":"cognito-identity.amazonaws.com"},"Action":"sts:AssumeRoleWithWebIdentity","Condition":{"StringEquals":{"cognito-identity.amazonaws.com:aud":"us-west-1:9cb26dab-294e-4d39-ada4-0dace6e9492a"},"ForAnyValue:StringLike":{"cognito-identity.amazonaws.com:amr":"authenticated"}}}]}'
   ```
5. **Asociar permisos MQTT de IoT Core al Rol**:
   ```bash
   aws iam put-role-policy --role-name healthnet-cognito-auth-role --policy-name healthnet-cognito-iot-policy --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["iot:Connect","iot:Subscribe","iot:Receive","iot:Publish"],"Resource":["arn:aws:iot:us-west-1:743337585043:client/healthnet-*","arn:aws:iot:us-west-1:743337585043:topic/healthnet/*","arn:aws:iot:us-west-1:743337585043:topicfilter/healthnet/*"]}]}'
   ```
6. **Vincular Rol al Identity Pool**:
   ```bash
   aws cognito-identity set-identity-pool-roles --identity-pool-id us-west-1:9cb26dab-294e-4d39-ada4-0dace6e9492a --roles authenticated=arn:aws:iam::743337585043:role/healthnet-cognito-auth-role
   ```

---

## 8. Justificación de Diseño y Vinculación Funcional

### A. Vinculación de IDs del `.env` con las funciones del Frontend
* **`VITE_COGNITO_USER_POOL_ID` & `VITE_COGNITO_APP_CLIENT_ID`**: Utilizadas por `src/services/auth.ts` y el hook `useAuth.ts` para verificar y bloquear el enrutador de React (`ProtectedRoute.tsx`) cuando el token expira o el usuario no está autenticado.
* **`VITE_COGNITO_IDENTITY_POOL_ID`**: Utilizada en `src/services/iot.ts` para realizar el intercambio criptográfico y obtener las credenciales de seguridad efímeras (Access Key, Secret Key y Session Token) antes del handshake de WebSockets.
* **`VITE_IOT_ENDPOINT`**: Configura la dirección del socket MQTT a la cual se conecta el cliente MQTT de Amplify. Posibilita la recepción reactiva en tiempo real sobre la suscripción MQTT de telemetría.

### B. Justificación de Decisiones de Diseño e Implementación
* **Unificación en "Pacientes y Brazalete" (ProfilePage.tsx)**: Los médicos manejan múltiples pacientes en paralelo, por lo que separar las opciones en páginas independientes requería navegación excesiva. Un selector único centraliza los datos fisiológicos del paciente, la configuración de umbrales clínicos del brazalete, el estado del ESP32 y una vista previa del tema del reloj en una sola pantalla visualmente integrada.
* **Umbrales Fisiológicos Dinámicos por Paciente**: Para evitar riesgos clínicos, eliminamos el uso de umbrales estáticos y globales. Ahora, cada paciente cuenta con sus propios límites clínicos (Ritmo Cardíaco Mín/Máx y Temp Máx) configurados en el estado reactivo de Zustand y persistidos localmente. La telemetría en vivo se evalúa en base a estos parámetros individuales, permitiendo disparar alertas adaptadas a la condición médica particular de cada persona.
* **Estructura de Doble Página en Reporte PDF y Control de Slices**: El reporte clínico generado con html2canvas + jsPDF sufría cortes de tablas e imágenes a mitad de página. Rediseñamos el template (`DeviceReportTemplate.tsx`) para dividir la estructura en dos contenedores fijos de 1120px (proporción A4 exacta). La Página 1 contiene el resumen analítico y los gráficos históricos de Recharts. La Página 2 contiene el registro de caídas e historial detallado. Esto garantiza que la tabla clínica empiece de manera limpia al inicio de la segunda página sin cortes accidentales.
* **Remoción del Acelerómetro y Balanceo de Gráficas**: Los datos crudos de acelerómetro (ejes X, Y, Z) generaban ruido visual al usuario médico (quien solo requiere saber si ocurrió una caída o no). Omitimos esta cuadrícula de la vista de monitoreo e integramos en su lugar un gráfico histórico de temperatura de tamaño compacto idéntico al de ritmo cardíaco. Esto balancea simétricamente la interfaz y prioriza los signos vitales críticos.

---

## 9. Registro de Problemas y Troubleshooting (AWS/VM)

| Problema / Diagnóstico | Causa Raíz | Comando CLI Solución |
| :--- | :--- | :--- |
| Al iniciar sesión, Cognito retorna un error de estado temporal del usuario | El administrador se creó en estado temporal `FORCE_CHANGE_PASSWORD` | `aws cognito-idp admin-set-user-password --user-pool-id us-west-1_pGyxBNhWT --username admin@healthnet.com --password 'Admin1234!' --permanent` |
| El WebSocket se abre (HTTP 101) pero se desconecta de inmediato de AWS IoT Core, entrando en bucle infinito | Las credenciales temporales otorgadas por Cognito Identity Pool no tienen permisos (políticas) asociados dentro del broker de IoT Core | 1. Obtener ID Identidad:<br>`aws cognito-identity list-identities --identity-pool-id us-west-1:9cb26dab-294e-4d39-ada4-0dace6e9492a --max-results 10`<br><br>2. Adjuntar política:<br>`aws iot attach-policy --policy-name healthnet-device-policy --target "us-west-1:ad125f69-93c4-c6c4-dc15-808df2efa4f8"` |
| Error `ResourceNotFoundException` al ejecutar AttachPolicy en la terminal | El nombre de la política proporcionado no coincide con el recurso creado en AWS, o la región de ejecución de CLI es distinta | Verificar que la política se llame `healthnet-device-policy` y que se esté ejecutando sobre el endpoint correcto en `us-west-1` |

---

## 10. Comandos del Proyecto (npm)

En el directorio raíz del proyecto, puedes ejecutar los siguientes scripts npm:

* **Iniciar en desarrollo**:
  ```bash
  npm run dev
  ```
  Levanta un servidor local en `http://localhost:5173` con soporte para recarga rápida de módulos (HMR).
* **Construir para producción**:
  ```bash
  npm run build
  ```
  Ejecuta la validación de tipos de TypeScript (`tsc`) y compila la aplicación optimizada para producción en la carpeta `dist/`.
* **Vista previa de la compilación**:
  ```bash
  npm run preview
  ```
  Servidor local ligero para servir la carpeta `dist/` compilada y probarla localmente.

---

## 11. Reglas de Alerta y Telemetría

Los umbrales estándar (límites por defecto) utilizados por el dashboard al inicializar un nuevo paciente son:

* **Ritmo Cardíaco Mínimo**: `50` bpm.
* **Ritmo Cardíaco Máximo**: `110` bpm.
* **Temperatura Máxima**: `38.0` °C.
* **Capacidad de Historial**: Mantiene las últimas `60` lecturas de telemetría en memoria por dispositivo para construir gráficos de tendencia suaves.
* **Detección de Caídas**: Ocurre en base a la flag `fallDetected` enviada por el acelerómetro del dispositivo.

Cualquier telemetría que rompa los umbrales configurados para el paciente correspondiente generará una alerta en tiempo real en la barra lateral del Dashboard, requiriendo atención o reconocimiento manual para su eliminación de las notificaciones activas.
