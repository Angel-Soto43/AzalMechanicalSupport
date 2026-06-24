export const getClausulaText = (id: string): string => {
  switch (id) {
    case 'A': return "Mantenimiento del sistema de procesamiento de datos: CFE División Sureste, Av. Manuel Álvarez Bravo No. 600, Fracc. Colinas de la Soledad, San Felipe del Agua, Oaxaca de Juárez, Oaxaca, C.P. 68020.";
    case 'B': return "Mantenimiento a un firewall Watch Guard Firebox XTM 505 y un firewall Watch Guard Firebox m200 (incluye U.P.S.) ubicado en la Dirección General de Materiales de Guerra, Interior del Campo No. 1-A \"Gral. Div. Alvaro Obregon\", Cd. Méx.";
    case 'C': return "Mantenimiento de 41 sitios de medición del sistema de porteo en los siguientes sitios:";
    default: return "";
  }
};