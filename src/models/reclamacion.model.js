import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Reclamacion = sequelize.define("Reclamacion", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    cliente_id: { type: DataTypes.INTEGER, allowNull: false },
    orden_id: { type: DataTypes.INTEGER, allowNull: true },
    
    causa: { 
        type: DataTypes.ENUM(
            'producto_defectuoso', 'producto_incorrecto', 'talla_incorrecta', 
            'calidad_no_esperada', 'pedido_incompleto',
            'cobro_duplicado', 'pago_no_reflejado', 'error_monto_cuota', 'cargos_desconocidos',
            'retraso_envio', 'paquete_no_entregado', 'direccion_incorrecta',
            'error_sistema', 'consulta_general', 'otros'
        ),
        allowNull: false 
    },
    
    descripcion: { type: DataTypes.TEXT, allowNull: false },
    evidencia_url: { type: DataTypes.STRING, allowNull: true },
    
    estado: { 
        type: DataTypes.ENUM('pendiente', 'en_revision', 'resuelta', 'rechazada'), 
        defaultValue: 'pendiente' 
    },
    resolucion_admin: { type: DataTypes.TEXT, allowNull: true }

  }, { 
    tableName: "reclamaciones",
    timestamps: true 
  });

  return Reclamacion;
};