-- ──────────────────────────────────────────────────────────────────────
-- HEALTH NET — Esquema de Base de Datos para Pacientes
-- Ejecuta este script en tu base de datos Aurora PostgreSQL.
-- ──────────────────────────────────────────────────────────────────────

-- Tabla para almacenar el perfil de los pacientes y la configuración del brazalete
CREATE TABLE IF NOT EXISTS patients (
    device_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    age VARCHAR(20),
    gender VARCHAR(50),
    weight VARCHAR(50),
    height VARCHAR(50),
    phone VARCHAR(50),
    emergency_contact VARCHAR(100),
    
    -- Configuración de alertas y brazalete
    hr_min INT DEFAULT 50,
    hr_max INT DEFAULT 110,
    temp_max NUMERIC(4, 2) DEFAULT 38.00,
    notifications_active BOOLEAN DEFAULT TRUE,
    watch_theme VARCHAR(20) DEFAULT 'dark',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexar device_id (aunque ya tiene índice por ser Primary Key)
CREATE INDEX IF NOT EXISTS idx_patients_device_id ON patients (device_id);

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
