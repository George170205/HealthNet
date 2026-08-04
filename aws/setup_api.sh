#!/bin/bash
# ──────────────────────────────────────────────────────────────────────
# HEALTH NET — Configuración de API Gateway en us-west-1
# Este script crea la API REST, los recursos /patients y /{deviceId},
# configura la integración proxy con Lambda y despliega en 'prod'.
# ──────────────────────────────────────────────────────────────────────

set -e

REGION="us-west-1"
ACCOUNT_ID="743337585043"
LAMBDA_NAME="healthnet-patients-api"
LAMBDA_ARN="arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${LAMBDA_NAME}"

echo "1. Creando API REST 'healthnet-api'..."
API_ID=$(aws apigateway create-rest-api --name "healthnet-api" --region ${REGION} --query 'id' --output text)
echo "API creada con ID: ${API_ID}"

echo "2. Obteniendo ID del recurso Raíz (/)..."
ROOT_ID=$(aws apigateway get-resources --rest-api-id ${API_ID} --region ${REGION} --query 'items[?path==`/`].id' --output text)
echo "Recurso Raíz ID: ${ROOT_ID}"

echo "3. Creando recurso '/patients'..."
PATIENTS_ID=$(aws apigateway create-resource --rest-api-id ${API_ID} --parent-id ${ROOT_ID} --path-part "patients" --region ${REGION} --query 'id' --output text)
echo "Recurso /patients ID: ${PATIENTS_ID}"

echo "4. Creando método ANY e integración Proxy en '/patients'..."
aws apigateway put-method --rest-api-id ${API_ID} --resource-id ${PATIENTS_ID} --http-method ANY --authorization-type "NONE" --region ${REGION}
aws apigateway put-integration --rest-api-id ${API_ID} --resource-id ${PATIENTS_ID} --http-method ANY --type AWS_PROXY --integration-http-method POST --uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations" --region ${REGION}

echo "5. Creando recurso '/patients/{deviceId}'..."
DEVICE_ID=$(aws apigateway create-resource --rest-api-id ${API_ID} --parent-id ${PATIENTS_ID} --path-part "{deviceId}" --region ${REGION} --query 'id' --output text)
echo "Recurso /patients/{deviceId} ID: ${DEVICE_ID}"

echo "6. Creando método ANY e integración Proxy en '/patients/{deviceId}'..."
aws apigateway put-method --rest-api-id ${API_ID} --resource-id ${DEVICE_ID} --http-method ANY --authorization-type "NONE" --region ${REGION}
aws apigateway put-integration --rest-api-id ${API_ID} --resource-id ${DEVICE_ID} --http-method ANY --type AWS_PROXY --integration-http-method POST --uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations" --region ${REGION}

echo "7. Otorgando permisos a API Gateway para invocar la Lambda..."
aws lambda add-permission --function-name ${LAMBDA_NAME} --statement-id apigateway-invoke-permission --action lambda:InvokeFunction --principal apigateway.amazonaws.com --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*/*/*" || true

echo "8. Desplegando la API en el stage 'prod'..."
aws apigateway create-deployment --rest-api-id ${API_ID} --stage-name prod --region ${REGION}

echo "=============================================================="
echo "¡API configurada con éxito!"
echo "Invoke URL: https://${API_ID}.execute-api.${REGION}.amazonaws.com/prod"
echo "Copia esta URL y ponla como valor de VITE_API_ENDPOINT en tu archivo .env"
echo "=============================================================="
