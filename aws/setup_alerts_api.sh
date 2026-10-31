#!/bin/bash
# ──────────────────────────────────────────────────────────────────────
# HEALTH NET — Configuración de API Gateway para Alertas
# Este script añade las rutas de alertas a la API existente.
# ──────────────────────────────────────────────────────────────────────

set -e

REGION="us-west-1"
ACCOUNT_ID="743337585043"
LAMBDA_NAME="healthnet-patients-api"
LAMBDA_ARN="arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${LAMBDA_NAME}"

echo "1. Obteniendo API ID de 'healthnet-api'..."
API_ID=$(aws apigateway get-rest-apis --region ${REGION} --query "items[?name=='healthnet-api'].id" --output text)

if [ -z "$API_ID" ]; then
  echo "Error: No se encontró la API 'healthnet-api'."
  exit 1
fi
echo "API encontrada con ID: ${API_ID}"

echo "2. Obteniendo ID del recurso Raíz (/)..."
ROOT_ID=$(aws apigateway get-resources --rest-api-id ${API_ID} --region ${REGION} --query 'items[?path==`/`].id' --output text)
echo "Recurso Raíz ID: ${ROOT_ID}"

echo "3. Creando recurso '/alerts'..."
ALERTS_ID=$(aws apigateway create-resource --rest-api-id ${API_ID} --parent-id ${ROOT_ID} --path-part "alerts" --region ${REGION} --query 'id' --output text || true)

# Si el recurso ya existe, lo buscamos
if [ -z "$ALERTS_ID" ] || [ "$ALERTS_ID" == "None" ]; then
  ALERTS_ID=$(aws apigateway get-resources --rest-api-id ${API_ID} --region ${REGION} --query 'items[?path==`/alerts`].id' --output text)
fi
echo "Recurso /alerts ID: ${ALERTS_ID}"

echo "4. Configurando integración ANY para '/alerts'..."
aws apigateway put-method --rest-api-id ${API_ID} --resource-id ${ALERTS_ID} --http-method ANY --authorization-type "NONE" --region ${REGION} || true
aws apigateway put-integration --rest-api-id ${API_ID} --resource-id ${ALERTS_ID} --http-method ANY --type AWS_PROXY --integration-http-method POST --uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations" --region ${REGION} || true

echo "5. Creando recurso '/alerts/{alertId}'..."
ALERT_ID_RESOURCE=$(aws apigateway create-resource --rest-api-id ${API_ID} --parent-id ${ALERTS_ID} --path-part "{alertId}" --region ${REGION} --query 'id' --output text || true)

if [ -z "$ALERT_ID_RESOURCE" ] || [ "$ALERT_ID_RESOURCE" == "None" ]; then
  ALERT_ID_RESOURCE=$(aws apigateway get-resources --rest-api-id ${API_ID} --region ${REGION} --query 'items[?path==`/alerts/{alertId}`].id' --output text)
fi
echo "Recurso /alerts/{alertId} ID: ${ALERT_ID_RESOURCE}"

echo "6. Configurando integración ANY para '/alerts/{alertId}'..."
aws apigateway put-method --rest-api-id ${API_ID} --resource-id ${ALERT_ID_RESOURCE} --http-method ANY --authorization-type "NONE" --region ${REGION} || true
aws apigateway put-integration --rest-api-id ${API_ID} --resource-id ${ALERT_ID_RESOURCE} --http-method ANY --type AWS_PROXY --integration-http-method POST --uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations" --region ${REGION} || true

echo "7. Creando recurso '/alerts/{alertId}/acknowledge'..."
ACK_ID_RESOURCE=$(aws apigateway create-resource --rest-api-id ${API_ID} --parent-id ${ALERT_ID_RESOURCE} --path-part "acknowledge" --region ${REGION} --query 'id' --output text || true)

if [ -z "$ACK_ID_RESOURCE" ] || [ "$ACK_ID_RESOURCE" == "None" ]; then
  ACK_ID_RESOURCE=$(aws apigateway get-resources --rest-api-id ${API_ID} --region ${REGION} --query 'items[?path==`/alerts/{alertId}/acknowledge`].id' --output text)
fi
echo "Recurso /alerts/{alertId}/acknowledge ID: ${ACK_ID_RESOURCE}"

echo "8. Configurando integración ANY para '/alerts/{alertId}/acknowledge'..."
aws apigateway put-method --rest-api-id ${API_ID} --resource-id ${ACK_ID_RESOURCE} --http-method ANY --authorization-type "NONE" --region ${REGION} || true
aws apigateway put-integration --rest-api-id ${API_ID} --resource-id ${ACK_ID_RESOURCE} --http-method ANY --type AWS_PROXY --integration-http-method POST --uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations" --region ${REGION} || true

echo "9. Desplegando en el stage 'prod'..."
aws apigateway create-deployment --rest-api-id ${API_ID} --stage-name prod --region ${REGION}

echo "=============================================================="
echo "¡Rutas de alertas añadidas y desplegadas con éxito en API Gateway!"
echo "=============================================================="
