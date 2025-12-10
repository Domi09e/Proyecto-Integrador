import db from "../models/index.js";

const { Cliente, Tienda, Orden, PagoBNPL, DocumentoCliente } = db;

export const getDashboardStats = async (req, res) => {
  try {
    // 1. Total de Clientes registrados
    const totalClientes = await Cliente.count();

    // 2. Total de Tiendas Activas
    const totalTiendas = await Tienda.count({
      where: { estado: 'activa' }
    });
    
    // 3. Documentos pendientes de revisión (Alerta)
    const documentosPendientes = await DocumentoCliente.count({
      where: { estado: 'pendiente' }
    });

    // 4. Dinero total procesado (Suma de todos los préstamos BNPL creados)
    const volumenTotal = await PagoBNPL.sum('monto_total') || 0;

    // 5. Últimas 5 Transacciones (Para la tabla inferior)
    const ordenesRecientes = await Orden.findAll({
      limit: 5,
      order: [['fecha', 'DESC']],
      include: [
        { model: Cliente, as: 'cliente', attributes: ['nombre', 'apellido'] },
        { model: Tienda, as: 'tienda', attributes: ['nombre'] }
      ]
    });

    // Enviamos el objeto con la estructura exacta que espera el Frontend
    res.json({
      totalClientes,
      totalTiendas,
      documentosPendientes,
      volumenTotal,
      ordenesRecientes: ordenesRecientes.map(o => ({
        id: o.id,
        cliente: `${o.cliente.nombre} ${o.cliente.apellido}`,
        tienda: o.tienda.nombre,
        total: o.total,
        fecha: o.fecha,
        estado: o.estado
      }))
    });

  } catch (error) {
    console.error("Error en dashboard stats:", error);
    res.status(500).json({ message: "Error cargando estadísticas" });
  }
};


export const getChartData = async (req, res) => {
  try {
    const { range } = req.query; // 'this_month', '6_months', 'this_year'
    
    let startDate = new Date();
    let dateFormat = 'day'; // 'day' o 'month'

    // 1. Configurar rango de fechas
    if (range === 'this_month') {
      startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      dateFormat = 'day';
    } else if (range === '6_months') {
      startDate.setMonth(startDate.getMonth() - 6);
      startDate.setDate(1); // Primer día del mes hace 6 meses
      dateFormat = 'month';
    } else if (range === 'this_year') {
      startDate = new Date(new Date().getFullYear(), 0, 1); // 1 de Enero
      dateFormat = 'month';
    } else {
      // Default: últimos 6 meses
      startDate.setMonth(startDate.getMonth() - 6);
      dateFormat = 'month';
    }

    // 2. Buscar pagos creados en ese rango
    const pagos = await PagoBNPL.findAll({
      attributes: ['monto_total', 'createdAt'],
      where: {
        createdAt: { [Op.gte]: startDate }
      },
      order: [['createdAt', 'ASC']]
    });

    // 3. Agrupar datos (Lógica JS para evitar SQL complejo)
    const dataMap = {};
    
    pagos.forEach(p => {
      const date = new Date(p.createdAt);
      let key;
      
      if (dateFormat === 'day') {
        key = date.getDate(); // Ej: "1", "15", "30"
      } else {
        // Ej: "Ene", "Feb"
        key = date.toLocaleDateString('es-DO', { month: 'short' }); 
      }

      if (!dataMap[key]) dataMap[key] = 0;
      dataMap[key] += Number(p.monto_total);
    });

    // 4. Formatear para el frontend (Array de objetos)
    // Rellenamos huecos básicos o devolvemos lo que hay
    const chartData = Object.keys(dataMap).map(key => ({
      label: key,
      value: dataMap[key]
    }));

    res.json(chartData);

  } catch (error) {
    console.error("Error chart data:", error);
    res.status(500).json({ message: "Error calculando gráfico" });
  }
};