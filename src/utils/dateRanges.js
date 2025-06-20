/**
 * Calcula el rango de fechas para 'today', 'week' o 'month'.
 * @param {'today'|'week'|'month'} range
 * @returns {{ start: Date, end: Date }}
 */
function dateRange(range) {
  const now = new Date();
  let start;

  switch (range) {
    case 'today':
      // Desde las 00:00 de hoy hasta ahora
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      break;

    case 'week':
      // Desde el lunes de esta semana (en UTC) hasta ahora
      // getDay(): domingo=0, lunes=1… sábado=6
      const day = now.getDay() === 0 ? 7 : now.getDay();
      start = new Date(now);
      start.setDate(now.getDate() - (day - 1));
      start.setHours(0, 0, 0, 0);
      break;

    case 'month':
      // Desde el primer día del mes hasta ahora
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      break;

    default:
      throw new Error(`Rango no soportado: ${range}`);
  }

  return { start, end: now };
}

module.exports = { dateRange };
