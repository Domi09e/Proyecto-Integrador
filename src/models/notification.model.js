// src/models/notificacion.model.js
export default (sequelize, DataTypes) => {
  const Notificacion = sequelize.define(
    "Notificacion",
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },

      // A quién va dirigida la notificación: admins o clientes
      rol_destino: {
        type: DataTypes.ENUM("admin", "cliente"),
        allowNull: false,
      },

      // Si es null => notificación global para todos los de ese rol
      // Si tiene número => notificación para un admin/cliente específico
      usuario_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      },

      // Título (lo que tu frontend llama "title")
      titulo: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },

      // Mensaje (tu frontend lo llama "message")
      mensaje: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },

      // Link opcional para "Abrir →"
      url: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      // Tipo/categoría de notificación
      // sirve para distinguir: documento, compra, sistema, etc.
      tipo: {
        type: DataTypes.ENUM("documento", "compra", "sistema", "otro"),
        defaultValue: "sistema",
      },

      // Campo flexible para futuras cosas (JSON en texto)
      // por ejemplo: { "compra_id": 123, "tienda_id": 5 }
      meta: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // Si está sin leer
      is_new: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: "notificaciones", // usa el nombre que ya tengas
      timestamps: true, // createdAt, updatedAt
    }
  );

  return Notificacion;
};
