# HEALTH NET — Manual de Instalación y Uso del Sistema

Este archivo contiene la documentación completa, guía de instalación sencilla, explicación de comandos y aclaración sin tecnicismos sobre cómo funciona el proyecto **HealthNet Dashboard**. Está diseñado para que cualquier persona con poca o nula experiencia en servidores o nube pueda entender y configurar el sistema.

---

## Índice
1. [¿Qué es HealthNet?](#1-qué-es-healthnet)
2. [Estructura del Proyecto y Carpetas](#2-estructura-del-proyecto-y-carpetas)
3. [Cómo arrancar la página en tu computadora (Instalación)](#3-cómo-arrancar-la-página-en-tu-computadora-instalación)
4. [¿Qué son las claves del archivo .env y cómo obtenerlas?](#4-qué-son-las-claves-del-archivo-env-y-cómo-obtenerlas)
5. [Aprovisionamiento en AWS (Comandos Explicados para Principiantes)](#5-aprovisionamiento-en-aws-comandos-explicados-para-principiantes)
6. [Explicación de las Decisiones de Diseño y Funcionalidad](#6-explicación-de-las-decisiones-de-diseño-y-funcionalidad)
7. [Qué problemas surgieron y cómo se resolvieron (Troubleshooting)](#7-qué-problemas-surgieron-y-cómo-se-resolvieron-troubleshooting)
8. [Comandos del Proyecto (npm)](#8-comandos-del-proyecto-npm)
9. [Reglas de Alerta por Defecto](#9-reglas-de-alerta-por-defecto)

---

## 1. ¿Qué es HealthNet?

**HealthNet Dashboard** es una página web diseñada para clínicas y hospitales que permite a los doctores y enfermeros vigilar los signos vitales de sus pacientes en tiempo real. 

Los pacientes usan un reloj inteligente (físico o simulado) que mide de manera automática su **ritmo cardíaco** y su **temperatura corporal**, además de detectar de forma instantánea si el paciente sufre una **caída accidental**. Si algo anda mal, la página web emite alertas inmediatas para que el personal de salud pueda reaccionar a tiempo.

---

## 2. Estructura del Proyecto y Carpetas

Para facilitar el mantenimiento del sitio web, todos los archivos se agrupan ordenadamente en carpetas dentro del directorio `src/`:

* **`src/components/`**: Contiene las piezas visuales pequeñas del sitio. Por ejemplo, el diseño en pantalla del reloj inteligente (`SmartwatchSimulator.tsx`) y la barra lateral de pestañas de navegación (`Sidebar.tsx`).
* **`src/components/charts/`**: Gráficas de tendencias que dibujan de manera interactiva cómo han subido o bajado las pulsaciones y la temperatura del paciente.
* **`src/pages/`**: Las pantallas completas que visitas al hacer clic en el menú. Ejemplos: el panel principal (`DashboardPage`), el simulador de relojes (`SimulatorPage`) y la pestaña unificada de pacientes (`ProfilePage`).
* **`src/services/`**: Código encargado de comunicar la página web con los servidores de internet (como la autenticación de doctores y el flujo de telemetría del reloj).
* **`src/store/`**: La memoria a corto plazo de la página web. Registra las alertas clínicas y almacena de forma persistente las preferencias de umbrales y colores elegidos para el reloj de cada paciente.
* **`src/types/`**: Plantillas que definen estrictamente el formato de los datos (qué campos debe enviar el reloj y qué datos almacena la ficha médica).

---

## 3. Cómo arrancar la página en tu computadora (Instalación)

Si deseas abrir y probar el sistema localmente en tu computadora de desarrollo, sigue estos sencillos pasos:

1. Abre tu consola de comandos (Terminal, CMD o PowerShell) en la carpeta del proyecto `healthnet-dashboard`.
2. **Descarga automática de componentes**: Ejecuta el siguiente comando para descargar de internet todos los paquetes que requiere la página para funcionar:
   ```bash
   npm install
   ```
3. **Copia del archivo de configuración**: Crea una copia del archivo de ejemplo para habilitar tus configuraciones locales:
   ```bash
   cp .env.example .env
   ```
4. Abre el archivo `.env` recién creado con cualquier editor de texto y rellena las claves de conexión a tu nube de AWS (si vas a hacer pruebas en la nube real) o déjalo vacío para usar el **Modo Demo local**.
5. **Arrancar el servidor de pruebas**: Ejecuta el comando para encender el servidor. Esto te dará una dirección local (por lo general, `http://localhost:5173`) para que la abras en tu navegador:
   ```bash
   npm run dev
   ```

---

## 4. ¿Qué son las claves del archivo .env y cómo obtenerlas?

El archivo `.env` es una lista de direcciones y accesos para enlazar la página web con los servicios en la nube de Amazon Web Services (AWS) en la región de `us-west-1` (California). Aquí se explica cada una de forma sencilla:

### A. VITE_COGNITO_USER_POOL_ID (La libreta de accesos)
Es el identificador del grupo de usuarios en la nube de AWS donde se guardan los correos y contraseñas de los médicos.
* **Comando para obtenerlo en la terminal**:
  ```bash
  aws cognito-idp list-user-pools --max-results 10
  ```
* **Qué buscas en la respuesta**: El ID con formato `us-west-1_xxxxxxxx`.

### B. VITE_COGNITO_APP_CLIENT_ID (El validador de accesos)
Es una clave pública asociada a la libreta de accesos anterior que autoriza a la página de inicio de sesión de React a comprobar si la clave y usuario ingresados son válidos.
* **Comando para obtenerlo**:
  ```bash
  aws cognito-idp list-user-pool-clients --user-pool-id us-west-1_pGyxBNhWT
  ```
* **Qué buscas en la respuesta**: La cadena alfanumérica de 26 caracteres identificada como `ClientId`.

### C. VITE_COGNITO_IDENTITY_POOL_ID (El pase de visitante temporal)
Es el ID de un servicio que le da pases temporales y seguros a los navegadores web de los doctores una vez que inician sesión. Esto permite que la página escuche en tiempo real las pulsaciones enviadas por el reloj inteligente.
* **Comando para obtenerlo**:
  ```bash
  aws cognito-identity list-identity-pools --max-results 10
  ```
* **Qué buscas en la respuesta**: El ID con formato `us-west-1:uuid-xxxx-xxxx...`.

### D. VITE_IOT_ENDPOINT (La antena de señales de AWS)
Es la dirección de internet de la 'antena virtual' de AWS encargada de recibir la batería, ritmo cardíaco y eventos de caídas enviados por los sensores ESP32 en vivo.
* **Comando para obtenerlo**:
  ```bash
  aws iot describe-endpoint --endpoint-type iot:Data-ATS
  ```
* **Qué buscas en la respuesta**: La dirección DNS en `endpointAddress`.

### E. Dirección de Base de Datos RDS (DB_HOST)
Es la ubicación de la computadora virtual y privada de AWS donde se guarda de forma segura el historial de latidos y temperatura de cada paciente.
* **Comando para obtenerlo**:
  ```bash
  aws rds describe-db-instances --query "DBInstances[*].Endpoint.Address" --output text
  ```

---

## 5. Aprovisionamiento en AWS (Comandos Explicados para Principiantes)

Para configurar e instalar los servidores necesarios en Amazon, se ejecutaron los siguientes comandos ordenados. Aquí se detalla la finalidad sencilla de cada paso:

### Paso 1: Crear la burbuja de red interna privada (VPC)
1. **Crear la red**: Establece un espacio de red privado exclusivo para el sistema donde nadie de internet pueda entrometerse:
   ```bash
   aws ec2 create-vpc --cidr-block '10.0.0.0/16' --no-amazon-provided-ipv6-cidr-block --instance-tenancy 'default' --tag-specifications '{"ResourceType":"vpc","Tags":[{"Key":"Name","Value":"healthnet-vpc"}]}'
   ```
2. **Crear áreas privadas aisladas**: Subredes privadas dentro de la red anterior para colocar ahí el disco duro PostgreSQL:
   ```bash
   aws ec2 create-subnet --vpc-id vpc-065feffb70147d508 --cidr-block 10.0.144.0/20 --availability-zone us-west-1c --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=healthnet-vpc-subnet-private2-us-west-1c}]'
   ```

### Paso 2: Crear el disco de base de datos relacional (PostgreSQL)
1. **Crear la base de datos**: Aprovisiona el clúster relacional Aurora PostgreSQL configurándole su clave maestra de administrador:
   ```bash
   aws rds create-db-cluster --db-cluster-identifier healthnet-aurora-cluster --engine aurora-postgresql --engine-version 15.4 --master-username postgres --master-user-password 'HealthNetSecurePass123!' --db-subnet-group-name healthnet-db-subnet-group --vpc-security-group-ids sg-01a1b01fbdf2be112
   ```

### Paso 3: Crear el robot de guardado automático (Lambda)
1. **Crear la función**: Sube un script automático (Lambda) que se activa cada vez que el reloj manda datos, insertándolos de inmediato en PostgreSQL:
   ```bash
   aws lambda create-function --function-name healthnet-telemetry-ingest --runtime nodejs18.x --role arn:aws:iam::743337585043:role/healthnet-lambda-execution-role --handler index.handler --zip-file fileb://function.zip --vpc-config SubnetIds=subnet-026b12c27c6039124,subnet-069ad6dfa5bd0612f,SecurityGroupIds=sg-01a1b01fbdf2be112 --environment 'Variables={DB_HOST=healthnet-db-instance.chiooewk8fd8.us-west-1.rds.amazonaws.com,DB_USER=postgres,DB_PASSWORD=HealthNetSecurePass123!,DB_NAME=postgres}'
   ```

### Paso 4: Configurar los pases de acceso (Cognito)
1. **Crear User Pool**: Habilita la libreta de accesos por correo para el dashboard:
   ```bash
   aws cognito-idp create-user-pool --pool-name healthnet-user-pool --username-attributes email --policies 'PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=false}'
   ```

---

## 6. Explicación de las Decisiones de Diseño y Funcionalidad

Tomamos decisiones enfocadas en simplificar la carga del personal médico y resolver fallos visuales:

* **Unificación en "Pacientes y Brazalete"**: Anteriormente, el doctor debía saltar entre pantallas separadas para cambiar los datos del paciente, ver el estado de la batería o ajustar el tema visual del reloj. Unificamos todo bajo un selector único de pacientes para que al elegir una persona, toda su información y configuración se cargue junta instantáneamente en una sola vista estructurada.
* **Límites de Alerta por Paciente**: El cuerpo de cada paciente funciona diferente. Para evitar falsas alarmas, el sistema evalúa la telemetría en base a límites clínicos que el médico configura de forma individual para cada persona (ej. Ana Ruiz tiene límites de pulso diferentes a los de Miguel González).
* **Reporte PDF sin Cortes de Página**: Diseñamos el reporte clínico para ajustarse de forma precisa a las proporciones de una hoja A4 convencional. Las gráficas analíticas se imprimen en la primera página, y la tabla de alertas detallada se dibuja al inicio de la segunda página. Esto evita cortes feos a mitad de datos y permite una presentación profesional.
* **Habilitar Mini-Gráfica y Quitar Datos de Aceleración**: La visualización de coordenadas espaciales ($X, Y, Z$) del sensor confundía a los médicos. Omitimos esos números crudos de la vista y colocamos en su lugar una mini-gráfica en tiempo real de temperatura corporal que hace juego visual con la del ritmo cardíaco, manteniendo la interfaz simple y enfocada.

---

## 7. Qué problemas surgieron y cómo se resolvieron (Troubleshooting)

| ¿Qué pasaba en la pantalla? | Explicación sencilla (Causa) | Comando CLI Solución |
| :--- | :--- | :--- |
| El médico no podía iniciar sesión con su correo administrador nuevo | Cognito crea las cuentas en estado temporal 'FORCE_CHANGE_PASSWORD'. Hay que forzar la contraseña como permanente para poder ingresar directo | `aws cognito-idp admin-set-user-password --user-pool-id us-west-1_pGyxBNhWT --username admin@healthnet.com --password 'Admin1234!' --permanent` |
| El simulador de reloj se desconectaba de inmediato de la pantalla | La sesión del navegador no tenía los permisos de seguridad vinculados para escuchar las señales de los relojes | 1. Obtener ID de sesión activa:<br>`aws cognito-identity list-identities --identity-pool-id us-west-1:9cb26dab-294e-4d39-ada4-0dace6e9492a --max-results 10`<br><br>2. Pegar permisos a la sesión:<br>`aws iot attach-policy --policy-name healthnet-device-policy --target "us-west-1:ad125f69-93c4-c6c4-dc15-808df2efa4f8"` |
| Error `ResourceNotFoundException` al ejecutar un comando | Se escribió con algún error de ortografía el nombre de la política de seguridad o el comando en la terminal | Corregir y usar el nombre de política oficial: `healthnet-device-policy` en us-west-1 |

---

## 8. Comandos del Proyecto (npm)

Ejecuta estos scripts en el directorio raíz del proyecto:

* **Iniciar en desarrollo**: `npm run dev` (abre un servidor local de pruebas en `http://localhost:5173`).
* **Construir para producción**: `npm run build` (compila y genera la versión final optimizada en la carpeta `dist/` para subirla a internet).
* **Vista previa**: `npm run preview` (ejecuta de forma ligera la carpeta compilada para verificar su correcto funcionamiento antes de publicarla).

---

## 9. Reglas de Alerta por Defecto

Cuando registras un nuevo paciente, el sistema le asigna automáticamente estos límites normales de salud:

* **Pulsaciones del corazón mínimas**: `50` latidos por minuto.
* **Pulsaciones del corazón máximas**: `110` latidos por minuto.
* **Temperatura corporal máxima**: `38.0` °C (a partir de aquí se considera estado febril).
* **Capacidad del gráfico**: Muestra las últimas `60` lecturas en pantalla para analizar tendencias claras.
* **Caídas**: El reloj inteligente envía una señal de caída que el sistema procesa de forma automática, activando una alerta roja inmediata en la pantalla.
