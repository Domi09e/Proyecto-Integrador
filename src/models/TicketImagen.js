export default (sequelize, DataTypes) => {
    const TicketImagen = sequelize.define("TicketImagen", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      // ticket_id se agrega automáticamente en las relaciones (index.js)
      ruta_archivo: { 
          type: DataTypes.STRING(500), 
          allowNull: false,
          comment: "Ruta relativa o URL de la imagen"
      },
      nombre_original: { type: DataTypes.STRING(255) } // Opcional: útil para debugging
    }, {
      tableName: "ticket_imagenes",
      timestamps: true, // Útil saber cuándo se subió
    });
  
    return TicketImagen;
  };