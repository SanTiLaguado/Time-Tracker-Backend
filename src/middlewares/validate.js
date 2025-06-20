const { validationResult } =  require('express-validator');

/**
 * Captura los errores producidos por express-validator.
 * Si hay errores, responde 400 con { errors: [ { msg, param, ... } ] }.
 * Si no, pasa al siguiente middleware/controlador.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Devuelvo un array con { param, msg, value } para cada fallo
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

module.exports = validate;
