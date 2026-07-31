# HEALTH NET — Documentación General del Proyecto

Este archivo contiene la documentación completa, instrucciones de instalación, guía de comandos, arquitectura y detalles técnicos sobre el proyecto **HealthNet Dashboard**.

---

## Índice
1. [Descripción del Proyecto](#1-descripción-del-proyecto)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Estructura del Proyecto](#3-estructura-del-proyecto)
4. [Instalación y Configuración](#4-instalación-y-configuración)
5. [Modos de Funcionamiento](#5-modos-de-funcionamiento)
6. [Guía de Configuración AWS](#6-guía-de-configuración-aws)
7. [Comandos del Proyecto](#7-comandos-del-proyecto)
8. [Reglas de Alerta y Telemetría](#8-reglas-de-alerta-y-telemetría)

---

## 1. Descripción del Proyecto

**HealthNet Dashboard** es una aplicación web (Single Page Application) desarrollada en **React, TypeScript y Vite** orientada al monitoreo en tiempo real de pacientes que utilizan dispositivos de salud portátiles (como un ESP32 o un simulador de telemetría).

El sistema permite:
* Visualizar en tiempo real el ritmo cardíaco, temperatura, estado de batería y acelerómetro de múltiples dispositivos.
* Detectar de forma inmediata eventos críticos como caídas o lecturas fuera de rangos normales.
* Gestionar alertas persistentes por dispositivo con la capacidad de reconocerlas (acknowledgement) individualmente.
* Simular múltiples dispositivos virtuales interactivos para pruebas locales o remotas.

---

## 2. Arquitectura del Sistema

La solución integra dispositivos inteligentes en el borde (Edge) con la nube de AWS para procesamiento y visualización en tiempo real en la región `us-west-1`:

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
* **Frontend**: React + TypeScript + TailwindCSS, hospedado en **Amazon S3** con resolución DNS vía **Amazon Route 53** y protegido con **AWS WAF**. Consume datos en tiempo real mediante WebSockets seguros (WSS) firmados con SigV4 y gestionados en base al estado de autenticación.
* **AWS Cognito**: Gestiona la autenticación de usuarios (User Pool) y provee credenciales temporales de AWS (Identity Pool) con permisos limitados para interactuar de forma segura con el broker AWS IoT Core.
* **AWS IoT Core**: Actúa como el bróker de mensajería MQTT donde se publica y consume la telemetría.
* **Amazon VPC**: Red virtual segura que aísla la base de datos y la ejecución de la función Lambda.
* **AWS Lambda**: Función serverless ejecutada en la VPC que recibe la telemetría desde la regla de IoT Core e inserta los registros en PostgreSQL.
* **Amazon Aurora PostgreSQL-Compatible DB**: Base de datos relacional administrada para almacenar el historial de lecturas de telemetría de forma persistente.

---

## 3. Diseño de Flujo de la Aplicación

El funcionamiento del sistema se divide en cuatro flujos principales interconectados:

### A. Flujo de Autenticación y Autorización
1. **Credenciales**: El usuario introduce sus datos de acceso en el formulario de inicio de sesión (`LoginPage`).
2. **Cognito User Pool**: El servicio `auth.ts` envía las credenciales a AWS Cognito User Pool para validar la identidad.
3. **Cognito Identity Pool**: Tras la autenticación exitosa, se solicitan credenciales de AWS temporales (Access Key ID, Secret Access Key y Session Token) al Identity Pool. Estas credenciales están asociadas a un rol de IAM con permisos específicos de IoT Core.

### B. Flujo de Conexión y Suscripción (Tiempo Real)
1. **Detección de Sesión**: La aplicación React detecta que el usuario está autenticado y posee credenciales válidas.
2. **Firma SigV4**: El servicio de IoT (`iotService.ts`) utiliza las credenciales temporales de AWS para calcular una firma digital estándar de AWS (Signature Version 4).
3. **Establecimiento de WebSocket**: Se genera una URL de conexión WebSocket con la firma SigV4 integrada y se establece el canal seguro (WSS) con AWS IoT Core.
4. **Suscripción MQTT**: Una vez conectado, el cliente MQTT del frontend se suscribe al tema comodín `healthnet/devices/+/telemetry` para recibir mensajes de cualquier paciente.

### C. Flujo de Telemetría y Persistencia de Datos
1. **Publicación**: El dispositivo (físico o simulado) emite periódicamente lecturas en formato JSON al tema `healthnet/devices/{deviceId}/telemetry`.
2. **Distribución en Tiempo Real**: AWS IoT Core distribuye inmediatamente la telemetría recibida al Dashboard a través del WebSocket activo.
3. **Almacenamiento Histórico**: Paralelamente, una **IoT Rule** en AWS intercepta el mensaje e invoca a una función **AWS Lambda** que reside en la VPC, la cual realiza la inserción de la telemetría en la base de datos **Amazon Aurora PostgreSQL-Compatible DB** en la tabla `telemetry`.

### D. Flujo de Gestión de Alertas
1. **Procesamiento de Telemetría**: Al recibir datos, el store de Zustand (`deviceStore.ts`) los evalúa frente a los límites definidos en `THRESHOLDS` (ritmo cardíaco elevado/bajo, temperatura alta, caída detectada).
2. **Generación de Alert**: Si la lectura sobrepasa los umbrales, se crea una alerta con un identificador único y se agrega a la lista de alertas activas en el estado global.
3. **Visualización e Interacción**: 
   * Las alertas se visualizan de manera destacada en el dropdown del Navbar y en las tarjetas del dashboard.
   * El usuario administrador puede presionar el ícono de campana en el Navbar para abrir un panel detallado que muestra qué paciente/dispositivo originó la alerta y su descripción.
   * El usuario puede reconocer (Aceptar/Descartar) la alerta desde el panel, lo cual actualiza el estado marcándola como `acknowledged` y limpiando la alerta visual de la interfaz.

---

## 4. Estructura del Proyecto

A continuación se detalla la estructura principal de directorios y archivos dentro de `src/`:

```
src/
├── config/
│   └── aws.ts            # Enlace de variables de entorno y configuración de AWS Amplify
├── types/
│   └── index.ts          # Interfaces de TypeScript (Telemetry, State, Alerts, Users)
├── store/
│   └── deviceStore.ts    # Estado global reactivo con Zustand (dispositivos, alertas y lógica de filtros)
├── services/
│   ├── auth.ts           # Servicio de autenticación con AWS Cognito (Amplify)
│   ├── iot.ts            # Conector MQTT/WebSocket a AWS IoT Core firmado con SigV4
│   └── simulator.ts      # Generador de dispositivos y telemetría simulada
├── hooks/
│   └── useAuth.ts        # Hook personalizado de React para interactuar con el contexto de autenticación
├── components/
│   ├── Logo.tsx          # Logotipo SVG corporativo
│   ├── Navbar.tsx        # Barra de navegación superior con estado de usuario
│   ├── ProtectedRoute.tsx# Wrapper para proteger rutas que requieren inicio de sesión
│   └── charts/
│       ├── HeartRateChart.tsx  # Gráfico histórico de ritmo cardíaco (Recharts)
│       └── TempChart.tsx       # Gráfico histórico de temperatura (Recharts)
├── pages/
│   ├── LoginPage.tsx     # Formulario de inicio de sesión (Soporta modo AWS y demo)
│   ├── DashboardPage.tsx # Panel principal con tarjetas de dispositivos y resumen de alertas
│   └── SimulatorPage.tsx # Consola interactiva para crear y controlar sensores virtuales
├── App.tsx               # Enrutador y proveedor de contexto global
├── App.css               # Estilos globales y personalizaciones visuales
└── main.tsx              # Punto de entrada de la aplicación
```

---

## 5. Instalación y Configuración

### Prerrequisitos
* **Node.js** v18 o superior.
* Administrador de paquetes **npm** (incluido con Node.js).

### Pasos de Instalación

1. **Clonar o descargar** el repositorio del proyecto en tu máquina local.
2. Navegar al directorio raíz e instalar las dependencias:
   ```bash
   cd healthnet-dashboard
   npm install
   ```
3. Configurar las variables de entorno. Copia el archivo de ejemplo para crear el archivo `.env` local:
   ```bash
   cp .env.example .env
   ```
4. Edita el archivo `.env` con las variables correspondientes a tus servicios en AWS (si deseas conectarte a una infraestructura real). Si no tienes configurado AWS, lee la siguiente sección sobre el **Modo Demo**.

---

## 6. Modos de Funcionamiento

La aplicación se puede ejecutar en dos modos dependiendo de la configuración de las variables de entorno:

### A. Modo Demo (Sin conexión a AWS)
Si el archivo `.env` no tiene cargadas las credenciales de AWS, el panel funcionará de manera local utilizando datos simulados en memoria:
* **Credenciales por defecto**:
  * **Email / Usuario**: `admin@healthnet.com`
  * **Contraseña**: `Demo1234!`
* **Funcionamiento**: El simulador incorporado despacha datos ficticios directamente al estado local (Zustand), permitiendo probar todas las vistas, gráficos y alertas sin costo y de forma instantánea.

### B. Modo AWS Real
Si completas los campos en `.env` (Región, Cognito User Pool, Client ID, Identity Pool e IoT Endpoint):
* **Autenticación**: Inicio de sesión real contra AWS Cognito.
* **Mensajería**: El dashboard firma la conexión a AWS IoT Core usando SigV4 y se suscribe al bróker vía MQTT/WebSockets reales para escuchar eventos en tiempo real.

---

## 7. Guía de Configuración AWS

Para desplegar la infraestructura requerida en AWS:

### 1. AWS Cognito
1. Ve a **AWS Console → Cognito → Create user pool**.
2. Configura el inicio de sesión usando **Email**.
3. Crea un App Client llamado `healthnet-dashboard` **sin client secret** (ya que es una SPA que corre en cliente web).
4. Crea un **Identity Pool** en Cognito y vincúlalo al User Pool creado. Proporciona permisos al rol IAM autenticado para interactuar con IoT Core mediante la siguiente política:
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
           "arn:aws:iot:REGION:ACCOUNT_ID:client/healthnet-*",
           "arn:aws:iot:REGION:ACCOUNT_ID:topic/healthnet/*",
           "arn:aws:iot:REGION:ACCOUNT_ID:topicfilter/healthnet/*"
         ]
       }
     ]
   }
   ```
5. Si deseas crear un usuario administrador inicial desde la CLI de AWS:
   ```bash
   aws cognito-idp admin-create-user \
     --user-pool-id TU_USER_POOL_ID \
     --username admin@healthnet.com \
     --temporary-password Admin1234! \
     --user-attributes Name=email,Value=admin@healthnet.com Name=email_verified,Value=true
   ```

### 2. AWS IoT Core
1. Copia tu **Device data endpoint** desde *IoT Core → Settings*.
2. Crea una política llamada `healthnet-device-policy` que permita conectar y publicar en temas del proyecto:
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

#### Estructura de Topics de MQTT
* **Publicación del Dispositivo**: `healthnet/devices/{deviceId}/telemetry`
* **Suscripción del Dashboard**: `healthnet/devices/+/telemetry`

### 3. Amazon Aurora PostgreSQL
Crea el clúster en RDS en la región `us-west-1` dentro de la VPC y ejecuta el siguiente script DDL para crear la tabla de telemetría:

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
```

Crea una función **AWS Lambda** para recibir e insertar los datos en Aurora PostgreSQL y configura una **IoT Rule** en AWS IoT Core para capturar los mensajes MQTT de `healthnet/devices/+/telemetry` e invocar a la Lambda.

---

## 8. Comandos del Proyecto

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
  Levanta un servidor local ligero para servir la carpeta `dist/` compilada y probarla localmente.

---

## 9. Reglas de Alerta y Telemetría

El archivo [types/index.ts](file:///c:/Users/junio/Claude/Projects/HealtNet/healthnet-dashboard/src/types/index.ts) define los umbrales estándar utilizados por el dashboard para disparar alertas inmediatas a los usuarios en la interfaz:

* **Ritmo Cardíaco Mínimo**: `50` bpm.
* **Ritmo Cardíaco Máximo**: `110` bpm.
* **Temperatura Máxima**: `38.0` °C.
* **Capacidad de Historial**: Mantiene las últimas `60` lecturas de telemetría en memoria por dispositivo para construir gráficos de tendencia suaves.
* **Detección de Caídas**: Ocurre en base a la flag `fallDetected` enviada por el acelerómetro del dispositivo.

Cualquier telemetría que rompa estos umbrales generará una alerta en tiempo real en la barra lateral del Dashboard, requiriendo atención o reconocimiento manual para su eliminación de las notificaciones activas.
