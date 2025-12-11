export default (sequelize, DataTypes) => {
  const TicketSoporte = sequelize.define("TicketSoporte", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    cliente_id: { type: DataTypes.INTEGER, allowNull: false },
    orden_id: { type: DataTypes.INTEGER, allowNull: true }, // Obligatorio si es reclamo
    
    // TIPO: Define si es una duda o un problema serio
    tipo: { 
        type: DataTypes.ENUM('consulta', 'reclamacion', 'devolucion', 'soporte_tecnico'), 
        defaultValue: 'consulta' 
    },

    // MOTIVO: La causa raíz del problema
    motivo: {
        type: DataTypes.ENUM(
            'producto_defectuoso',   // Roto/dañado
            'producto_incorrecto',   // No es lo que pedí
            'pedido_no_entregado',   // No llegó
            'cobro_indebido',        // Error en el pago BNPL
            'arrepentimiento',       // Devolución por gusto
            'falla_tecnica',         // App no funciona
            'duda_general',          // Preguntas simples
            'otro'
        ),
        allowNull: false,
        defaultValue: 'duda_general'
    },

    asunto: { type: DataTypes.STRING(255), allowNull: false },
    descripcion_inicial: { type: DataTypes.TEXT, allowNull: false },
    
    estado: { 
      type: DataTypes.ENUM('abierto', 'en_proceso', 'resuelto', 'cerrado', 'rechazado'), 
      defaultValue: 'abierto' 
    },
    
    prioridad: { 
      type: DataTypes.ENUM('baja', 'media', 'alta'), 
      defaultValue: 'media' 
    },
    
    fecha_creacion: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: "ticketssoporte",
    timestamps: false,
  });
  return TicketSoporte;
};